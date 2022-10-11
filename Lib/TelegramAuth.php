<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace Modules\ModuleTelegramProvider\Lib;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use Phalcon\Mvc\Model\Resultset;
use Throwable;
use JsonException;

class TelegramAuth extends WorkerBase
{
    public const   PHONE_SESSION_TEMPLATE = 'db/keyboard/$phone';

    public const   TEXT_ENTER_PHONE = 'Enter phone number:';
    public const   TEXT_AUTH_OK     = 'Authorization OK';

    private const  STDIN_NUM        = 0;
    private const  STDOUT_NUM       = 1;
    private const  STDERR_NUM       = 2;
    private string $workKeyboardDir = '';
    private string $workBotDir = '';
    private string $workDir = '';


    private int    $id = 0;
    private        $proc;
    private array  $pipes = [];
    private string $moduleDir;
    private array  $expectEnd = [
        self::TEXT_AUTH_OK => true,
        "Logging out" => false,
        "Closing" => false,
        "Terminated" => false
    ];
    private array  $expectActions = [
        self::TEXT_ENTER_PHONE                       => false,
        'Enter authentication code:'                 => false,
        'Confirm this login link on another device:' => false,
        'Enter authentication password:'             => false,
        'Enter your first name:'                     => false,
        'Enter your last name:'                      => false,
        // go-tdlib
        'Enter code:'                                => 'Enter authentication code:',
        'Enter password:'                            => 'Enter authentication password:',
    ];
    private int    $readTimeout = 2;
    private int    $absTimeout  = 120;
    private string $error = '';
    private string $login   = '';
    private array  $translates    = [];


    /**
     * Получение данных вывода приложение и ожидание ввода значения пользователем.
     * @param $action
     * @return bool
     */
    private function invokeAction($action):bool
    {
        if(empty($action)){
            return true;
        }
        $res = true;
        if(!array_key_exists($action, $this->expectActions)){
            $res = false;
            $this->error = 'Unknown command received: '.$action;
        }elseif($this->expectActions[$action] !== false){
            $action = $this->expectActions[$action];
        }
        if(self::TEXT_ENTER_PHONE === $action){
            $enteredText = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $this->login);
        }else{
            $enteredText = $this->getInputData($action);
        }
        if(!empty($enteredText)){
            $this->writeCommand($enteredText.PHP_EOL);
        }
        $output = $this->readOutput(true);
        $done   = $this->checkOutput($output);
        if(!$done){
            $this->error = str_replace('Error: error ','',$output);
            if(!empty($this->error)){
                $this->updateStatus(TelegramProviderConf::STATUS_ERROR, $this->error);
                $res = false;
            }
        }
        return $res;
    }

    /**
     * Эмуляция запроса логина.
     * @param $action
     * @return void
     */
    private function tgAuthTesting($action):void
    {
        $this->getInputData($action);
        sleep(4);
        $this->updateStatus(TelegramProviderConf::STATUS_DONE, '');
    }

    /**
     * Обновляет статус файл и ожидает ввода пользовтеля.
     * @param $action
     * @return string
     */
    private function getInputData($action):string
    {
        $this->updateStatus(TelegramProviderConf::STATUS_WAIT_INPUT, $action);
        $enteredText = '';
        $startTime   = time();
        try {
            do{
                sleep(1);
                $deltaTime  = time() - $startTime;
                $result = json_decode(
                    file_get_contents("$this->workDir/" . TelegramProviderConf::STATUS_FILE_NAME),
                    true,
                    512,
                    JSON_THROW_ON_ERROR
                );
                if($result['output'] !== $action){
                    break;
                }
                $enteredText = $result['data']??'';
            } while ($deltaTime <= $this->absTimeout && empty($enteredText));
        }catch (Throwable $e){
            Util::sysLogMsg(self::class, $e->getMessage());
        }
        $this->updateStatus(TelegramProviderConf::STATUS_WAIT_RESPONSE, '');
        return $enteredText;
    }

    /**
     * Уничтожение объекта.
     */
    public function __destruct()
    {
        parent::__destruct();
        if(count($this->pipes) === 3){
            fclose($this->pipes[self::STDIN_NUM]);
            fclose($this->pipes[self::STDERR_NUM]);
            fclose($this->pipes[self::STDOUT_NUM]);
        }
        if(is_resource($this->proc)){
            proc_terminate($this->proc);
        }
        if(empty($this->error) && $this->id > 0){
            $this->updateStatus(TelegramProviderConf::STATUS_DONE, '');
            $tg = new TelegramProviderConf();
            $tg->startLauncher($this->id);
        }
    }

    /**
     * Записывает данные о статусе авторизации в файл.
     * @param $status
     * @param $data
     * @return void
     */
    private function updateStatus($status, $data):void{
        if($status === TelegramProviderConf::STATUS_WAIT_INPUT){
            $query = [
                'status' => $status,
                'output' => $data,
                'data'   => ''
            ];
        }else{
            $query = [
                'status' => $status,
                'output' => $data,
            ];
        }
        $statusFile = "$this->workDir/".TelegramProviderConf::STATUS_FILE_NAME;
        try {
            file_put_contents($statusFile, json_encode($query, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
        }catch (JsonException $e){
            Util::sysLogMsg(__CLASS__, $e->getMessage());
        }
    }

    public function makeSettingsKeyboardFile($numPhone):string
    {
        $resultFile = "";
        $this->login = $numPhone;
        $this->initWorkDir($numPhone);
        $this->workDir =  $this->workKeyboardDir;
        if(!file_exists($this->workDir)){
            return $resultFile;
        }
        $data = [];
        $phone    = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $numPhone);
        /** @var ModuleTelegramProvider $setting */
        $setting = ModuleTelegramProvider::findFirst("phone_number='$phone'");
        if($setting){
            $providers = Sip::find("host='127.0.0.1'");
            $providers->setHydrateMode(
                Resultset::HYDRATE_OBJECTS
            );
            $idProviders = [];
            /** @var Sip $provider */
            foreach ($providers as $provider){
                $idProviders[$provider->port] = $provider->uniqid;
            }
            $idRoutes = [];
            $routes   = OutgoingRoutingTable::find();
            $routes->setHydrateMode(
                Resultset::HYDRATE_OBJECTS
            );
            /** @var OutgoingRoutingTable $route */
            foreach ($routes as $route){
                $idRoutes[$route->providerid] = $route->numberbeginswith;
            }

            $callbackQueue = $setting->callbackQueue;
            /** @var CallQueues $queue */
            $queues = CallQueues::find("id='$callbackQueue'");
            $queues->setHydrateMode(
                Resultset::HYDRATE_OBJECTS
            );
            foreach ($queues as $queue){
                $data["QueueId"]  = $queue->uniqid;
                $data["QueueNum"] = $queue->extension;
            }
            $data["PrefixExten"] = $idRoutes[$idProviders[30000 + $setting->id]??'']??'';
            $data["PrefixVar"] = $idRoutes[$idProviders[30000 + $setting->id]??'']??'';
            $data["DtmfText"]   = $setting->keyboardText;
            $data["ApiId"]   = (int)$setting->api_id;
            $data["ApiHash"] = $setting->api_hash;
            $data["TgPhone"] = $phone;
            $data["LogDir"]  = System::getLogDir()."/".basename(TelegramProviderConf::getModDir());
            $data["LogFile"] = $data["LogDir"]."/tg-chats.log";
            $data["AutoAnswerText"] = $setting->autoAnswerText;
            $data["Token"]   = $setting->botId;
            [$data["BotId"]] = explode(':', $setting->botId);
            $data["BotId"]   = (int)$data["BotId"];
            $data["LogLevel"] = 1;
            $data["TdDir"] = $this->workKeyboardDir;
            $data["AmiHost"] = '127.0.0.1';
            $data["AmiPort"] = PbxSettings::getValueByKey('AMIPort');
            $data["AmiLogin"] = 'phpagi';
            $data["AmiPassword"] = 'phpagi';

            $config = $this->getDI()->get('config');
            $data["RedisAddres"]        = $config->redis->host.":".$config->redis->port;
            $data["RedisDbIndex"]       = 3;
            $data["CallbackButtonText"] = $this->translate('request a call back');
            $data["CallbackTitle"]      = $this->translate('Ordering a callback');
            $data["callbackText"]       = $setting->businessCardText;
            $data["DtmfTitle"]          = $this->translate('Internal number entry form');
            $data["RedisKeyPrefix"]     =  "tg_provider_";
            $resultFile = "$this->workKeyboardDir/settings.conf";
            file_put_contents($resultFile, json_encode($data, JSON_PRETTY_PRINT |JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

            $data["LogFile"] = $data["LogDir"]."/tg-bot.log";
            file_put_contents("$this->workBotDir/settings.conf", json_encode($data, JSON_PRETTY_PRINT |JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        }

        return $resultFile;
    }

    /**
     * Запуск процесса авторизации.
     * @param string $params
     */
    public function start($params):void
    {
        if(empty($params)){
            exit(1);
        }
        $this->login = $params;
        $numPhone   = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $params);
        $title      = 'gen_db_'.$numPhone;
        $pid = Processes::getPidOfProcess($title);
        if(!empty($pid)){
            exit(2);
        }
        cli_set_process_title($title);

        [$confFile, $id] = $this->makeSettingsFile($numPhone);
        if(!file_exists($confFile)){
            exit(3);
        }

        $pid = Processes::getPidOfProcess("tg2sip -$id-");
        if(!empty($pid)){
            // Процесс авторизации не требуется. Шлюз уже запущен.
            return;
        }

        if(defined('TG_DRY_RUN')){
            $cmd = "$this->moduleDir/bin/test-auth-app.sh";
        }else{
            shell_exec('killall gen_db > /dev/null 2> /dev/null');
            $cmd = "$this->moduleDir/bin/gen_db";
        }

        $descriptors = [
            self::STDIN_NUM  => ["pipe", "r"],
            self::STDOUT_NUM => ["pipe", "w"],
            self::STDERR_NUM => ["pipe", "w"]
        ];

        $this->proc  = proc_open($cmd, $descriptors, $this->pipes, $this->workDir);
        $this->setupStreams();
        $startTime = time();
        $macDelta= $this->absTimeout;
        do {
            $deltaTime  = time() - $startTime;
            $output     = $this->readOutput();
            if($this->checkOutput($output)){
                break;
            }
            $err = $this->readOutput(true);
            if($this->checkOutput($err)){
                break;
            }
            $res        = $this->invokeAction($output);
            if($macDelta === $this->absTimeout && (proc_get_status($this->proc)['running']??false) !== true){
                $macDelta = time() - $startTime + 5;
            }
        } while ($deltaTime <= $this->absTimeout && $res === true);
    }

    public function startKeyboard($params):void
    {
        if(empty($params)){
            exit(1);
        }

        $this->login = $params;
        $numPhone   = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $params);
        $title      = 'auth_keyboard_'.$numPhone;
        $pid = Processes::getPidOfProcess($title);
        if(!empty($pid)){
            exit(2);
        }
        cli_set_process_title($title);
        $confKeyboardFile = $this->makeSettingsKeyboardFile($numPhone);
        if(!file_exists($confKeyboardFile)){
            exit(4);
        }

        $pid = Processes::getPidOfProcess($confKeyboardFile);
        if(empty($pid)){
            if(defined('TG_DRY_RUN')){
                $cmd = "$this->moduleDir/bin/test-auth-app.sh";
            }else{
                $cmd = "$this->moduleDir/bin/td-keyboard -c=$confKeyboardFile -u -auth";
            }
            // Запуск авторизации только если нет запущенного процесса.
            $descriptors = [
                self::STDIN_NUM  => ["pipe", "r"],
                self::STDOUT_NUM => ["pipe", "w"],
                self::STDERR_NUM => ["pipe", "w"]
            ];
            $this->proc  = proc_open($cmd, $descriptors, $this->pipes);
            $this->setupStreams();
            $startTime = time();
            $maxDelta= $this->absTimeout;
            do {
                $deltaTime  = time() - $startTime;
                $output     = $this->readOutput();
                if($this->checkOutput($output)){
                    break;
                }
                $err = $this->readOutput(true);
                if($this->checkOutput($err)){
                    break;
                }
                $res        = $this->invokeAction($output);
                if($maxDelta === $this->absTimeout && (proc_get_status($this->proc)['running']??false) !== true){
                    $maxDelta = time() - $startTime + 5;
                }
            } while ($deltaTime <= $maxDelta && $res === true);
        }

        $this->workDir = $this->workBotDir;
        $timeout = Util::which('timeout');
        $this->updateStatus(TelegramProviderConf::STATUS_START_AUTH, '');
        $output = trim(shell_exec("$timeout 2 $this->moduleDir/bin/td-keyboard -auth -c=$confKeyboardFile $this->workBotDir/settings.conf"));
        $this->checkOutput($output);
    }

    /**
     * Создание рабочего каталога.
     * @param $numPhone
     * @return void
     */
    private function initWorkDir($numPhone):void
    {
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst("phone_number='$this->login'");
        if(!$settings){
            return;
        }
        $this->moduleDir        = TelegramProviderConf::getModDir();
        $this->workDir          = "$this->moduleDir/db/$numPhone";
        $this->workKeyboardDir  = "$this->moduleDir/db/keyboard/$numPhone";
        Util::mwMkdir($this->workKeyboardDir."/database");

        $this->workBotDir = "$this->moduleDir/db/keyboard/bot";
        Util::mwMkdir($this->workBotDir);
        Util::mwMkdir($this->workDir, true);
    }

    /**
     * Подключаем переводы.
     * @param $key
     * @return mixed
     */
    private function translate($key)
    {
        if(empty($this->translates)){
            $language = PbxSettings::getValueByKey('WebAdminLanguage');
            try {
                $this->translates = include TelegramProviderConf::getModDir() . "/Messages/{$language}.php";
            }catch (\Throwable $e){
                Util::sysLogMsg(__CLASS__, $e->getMessage());
            }
        }
        return $this->translates[$key]??$key;
    }

    /**
     * Создание конфиг файла.
     * @param $numPhone
     * @return string
     */
    private function makeSettingsFile($numPhone):array
    {
        $filename = '';
        $debugLvl = 1;
        $this->initWorkDir($numPhone);
        if(!file_exists($this->workDir)){
            return $filename;
        }
        /** @var ModuleTelegramProvider $settings */
        $settings   = ModuleTelegramProvider::findFirst("phone_number='$this->login'");
        $this->id   = $settings->id;
        $filename   = $this->workDir.'/settings.ini';
        if(file_exists($filename)){
            $output = shell_exec("cd '$this->workDir'; /bin/busybox timeout 0.5 $this->moduleDir/bin/gen_db 2>&1");
            $this->checkOutput(trim($output));
        }
        $port   = 30000 + $settings->id;
        $config =   '[logging]'.PHP_EOL.
            "core=$debugLvl".PHP_EOL.
            "tgvoip=$debugLvl".PHP_EOL.
            "pjsip=$debugLvl".PHP_EOL.
            "sip_messages=true".PHP_EOL.
            "file_min_level=4".PHP_EOL.
            "tdlib=1".PHP_EOL.
            "console_min_level=1".PHP_EOL.
            PHP_EOL.
            "[sip]".PHP_EOL.
            "public_address=127.0.0.1".PHP_EOL.
            "port=$port".PHP_EOL.
            "id_uri=sip:$numPhone@127.0.0.1".PHP_EOL.
            "callback_uri=sip:$numPhone@127.0.0.1".PHP_EOL.
            "raw_pcm=false".PHP_EOL.
            "thread_count=1".PHP_EOL.
            PHP_EOL.
            "[telegram]".PHP_EOL.
            "api_id=$settings->api_id".PHP_EOL.
            "api_hash=$settings->api_hash".PHP_EOL.
            PHP_EOL.
            '[other]'.PHP_EOL;

        file_put_contents($filename, $config);

        return [$filename, $this->id];
    }

    /**
     * Проверка на завершение работы приложения аутентификации.
     * @param $output
     * @return void
     */
    private function checkOutput($output):bool
    {
        $done = false;
        if(array_key_exists($output, $this->expectEnd)){
            if($this->expectEnd[$output] === true){
                $status = TelegramProviderConf::STATUS_DONE;
                $done = true;
            }else{
                $status = TelegramProviderConf::STATUS_ERROR;
            }
            $this->updateStatus($status, $output);
        }
        return $done;
    }

    /**
     * Установка таймаута на чтение для потоков.
     * Отключение блокировки потока.
     */
    private function setupStreams():void
    {
        foreach ($this->pipes as $stream){
            stream_set_timeout($stream, 1);
            stream_set_blocking($stream, false);
        }
    }

    /**
     * @param bool $error
     * @return string
     */
    private function readOutput(bool $error = false):string{
        $out    = '';
        $startTime  = time();

        $streamId   = ($error === true)?self::STDERR_NUM:self::STDOUT_NUM;
        $stream     = &$this->pipes[$streamId];
        do {
            $deltaTime  = time() - $startTime;
            $needRead = 1;
            $stdout     = stream_get_contents($stream, $needRead);
            if($stdout) {
                $out .= $stdout;
            }
        } while ($deltaTime <= $this->readTimeout);
        $metadata   = stream_get_meta_data($stream);
        $needRead   = $metadata['unread_bytes'];
        if($needRead !== 0){
            $out.= stream_get_contents($stream, $needRead);
        }
        return trim($out);
    }

    /**
     * @param $command
     */
    private function writeCommand($command):void{
        fwrite($this->pipes[self::STDIN_NUM], $command);
    }

}