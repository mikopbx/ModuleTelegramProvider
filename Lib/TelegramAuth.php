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

use danog\MadelineProto\Logger as MadelineProtoLogger;
use danog\MadelineProto\Settings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use danog\MadelineProto\API;
use Throwable;
use JsonException;
use danog\MadelineProto\Shutdown;

class TelegramAuth extends WorkerBase
{
    public const   AUTH_OBJECT_NAME       = 'auth.authorization';
    public const   BOT_SESSION_PATH       = 'db/madeline/bot/bot.madeline';
    public const   PHONE_SESSION_TEMPLATE = 'db/madeline/$phone/session.madeline';

    public const   TEXT_ENTER_PHONE = 'Enter phone number:';
    public const   TEXT_AUTH_OK     = 'Authorization OK';

    private const  STDIN_NUM        = 0;
    private const  STDOUT_NUM       = 1;
    private const  STDERR_NUM       = 2;


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
    ];
    private int    $readTimeout = 2;
    private int    $absTimeout  = 120;
    private string $error = '';
    private string $workDir = '';
    private string $login   = '';

    /**
     * Получение данных вывода приложение и ожидание ввода значения пользователем.
     * @param $action
     * @return bool
     */
    private function invokeAction($action):bool
    {
        $res = true;
        if(!array_key_exists($action, $this->expectActions)){
            $res = false;
            $this->error = 'Unknown command received: '.$action;
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
        $this->checkOutput($output);

        $this->error = str_replace('Error: error ','',$output);
        if(!empty($this->error)){
            $this->updateStatus(TelegramProviderConf::STATUS_ERROR, $this->error);
            $res = false;
        }
        return $res;
    }

    /**
     * Авторизация клиента телеграм и бота телеграм.
     * @param      $params
     * @return void
     */
    public function messengerLogin($params):void
    {
        if(empty($params)){
            return;
        }
        $phone          = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $params);
        $sessionPath    = TelegramProviderConf::getModDir().'/'.str_replace( '$phone', $phone, self::PHONE_SESSION_TEMPLATE);
        $madeLineDir    = dirname($sessionPath);
        $this->workDir  = $madeLineDir;

        if(defined('TG_DRY_RUN')){
            $this->tgAuthTesting('messengerGetPhoneCode');
            return;
        }
        Util::mwMkdir($madeLineDir, true);
        if(!file_exists($madeLineDir)){
            return;
        }
        $pid = Processes::getPidOfProcess(basename($sessionPath));
        if(!empty($pid)){
            // Удаляем процессы сессии.
            $killPath = Util::which('kill');
            shell_exec("$killPath $pid");
        }
        // Чистим предудыщие сессии.
        shell_exec(Util::which('rm')." -rf $madeLineDir/*");

        $settings       = self::messengerInitSettings();
        $MadelineProto  = new API($sessionPath, $settings);
        Shutdown::addCallback(static function () use ($MadelineProto) {
            $MadelineProto->__destruct();
        });
        $MadelineProto->async(false);

        $MadelineProto->phoneLogin($phone);
        $authorization = $MadelineProto->completePhoneLogin($this->getInputData('messengerGetPhoneCode'));
        if ($authorization['_'] === 'account.password') {
            $authorization = $MadelineProto->complete2falogin($this->getInputData('Enter authentication password:'));
        }
        if ($authorization['_'] === 'account.needSignup') {
            $firstName = $this->getInputData('Enter your first name:');
            $lastName  = $this->getInputData('Enter your last name:');
            $MadelineProto->completeSignup($firstName, $lastName);
        }
        if($authorization['_'] === self::AUTH_OBJECT_NAME && isset($authorization['user']['phone'])){
            $this->updateStatus(TelegramProviderConf::STATUS_DONE, '');
        }else{
            $this->updateStatus(TelegramProviderConf::STATUS_ERROR, $authorization);
        }
        $MadelineProto->__destruct();
    }

    /**
     Создание сессии бота.
     * @return void
     */
    public function messengerBotLogin():void
    {
        $sessionPath   =  TelegramProviderConf::getModDir().'/'.self::BOT_SESSION_PATH;
        $this->workDir = dirname($sessionPath);
        if(defined('TG_DRY_RUN')){
            $this->tgAuthTesting('messengerGetBotToken');
            return;
        }
        Util::mwMkdir($this->workDir, true);
        if(!file_exists($this->workDir)){
            $this->updateStatus(TelegramProviderConf::STATUS_ERROR, 'Failed to create a directory: bot work dir');
            return;
        }
        $botToken    = $this->getInputData('messengerGetBotToken');
        if(empty($botToken)){
            $this->updateStatus(TelegramProviderConf::STATUS_ERROR, 'Bot Token Input Timeout Exceeded');
            return;
        }
        $settings       = self::messengerInitSettings();
        // Очистка прошлых сессий.
        shell_exec(Util::which('rm')." -rf $sessionPath*");

        $MadelineProto  = new API($sessionPath, $settings);
        Shutdown::addCallback(static function () use ($MadelineProto) {
            $MadelineProto->__destruct();
        });
        $MadelineProto->async(false);
        $authorization = $MadelineProto->botLogin($botToken);
        if($authorization === null){
            $pid = Processes::getPidOfProcess(basename($sessionPath));
            if(!empty($pid)){
                $authorization = ['_' => self::AUTH_OBJECT_NAME];
                $killPath = Util::which('kill');
                shell_exec("$killPath $pid");
            }
        }
        if($authorization['_'] === self::AUTH_OBJECT_NAME){
            $this->updateStatus(TelegramProviderConf::STATUS_DONE, '');
            // Сохраним ID бота.
            $botId = explode(':',$botToken)[0]??'';
            if(!empty($botId)){
                /** @var ModuleTelegramProvider $setting */
                $settings = ModuleTelegramProvider::find();
                foreach ($settings as $setting){
                    $setting->botId = $botId;
                    $setting->save();
                }
            }
        }else{
            $this->updateStatus(TelegramProviderConf::STATUS_ERROR, $authorization);
        }
        $MadelineProto->__destruct();
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
     * Возвращает объект настроек для API подключения месенджера telegram.
     * @return Settings
     */
    public static function messengerInitSettings():Settings
    {
        $settings = new Settings();
        /** @var ModuleTelegramProvider $settings */
        $setting = ModuleTelegramProvider::findFirst();
        if($setting){
            $appInfo = new Settings\AppInfo();
            $appInfo->setApiId($setting->api_id);
            $appInfo->setApiHash($setting->api_hash);
            $settings->setAppInfo($appInfo);

            $logFile = System::getLogDir()."/".basename(TelegramProviderConf::getModDir()).'/madeline-messenger.log';
            $logger = new Settings\Logger();
            $logger->setType(MadelineProtoLogger::FILE_LOGGER);
            $logger->setLevel(MadelineProtoLogger::LEVEL_ERROR);
            $logger->setExtra($logFile);
            $settings->setLogger($logger);
        }
        return $settings;
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
        $id = Processes::getPidOfProcess($title);
        if(!empty($id)){
            exit(2);
        }
        cli_set_process_title($title);

        $confFile = $this->makeSettingsFile($numPhone);
        if(!file_exists($confFile)){
            exit(3);
        }
        // Чистим старые настройки.
        if(defined('TG_DRY_RUN')){
            $this->tgAuthTesting('Enter authentication code:');
            return;
        }
        $descriptors = [
            self::STDIN_NUM  => ["pipe", "r"],
            self::STDOUT_NUM => ["pipe", "w"],
            self::STDERR_NUM => ["pipe", "w"]
        ];
        shell_exec('killall gen_db');
        $this->proc  = proc_open("$this->moduleDir/bin/gen_db", $descriptors, $this->pipes, $this->workDir);
        $this->setupStreams();
        $startTime = time();
        do {
            $deltaTime  = time() - $startTime;
            $output     = $this->readOutput();
            $this->checkOutput($output);
            $res        = $this->invokeAction($output);
        } while ($deltaTime <= $this->absTimeout && $res === true);
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
        $this->moduleDir  = TelegramProviderConf::getModDir();
        $this->workDir    = $this->moduleDir.'/db/'.$numPhone;
        Util::mwMkdir($this->workDir, true);
    }

    /**
     * Создание конфиг файла.
     * @param $numPhone
     * @return string
     */
    private function makeSettingsFile($numPhone):string
    {
        $filename = '';
        $debugLvl = 6;
        /** @var ModuleTelegramProvider $settings */
        $this->initWorkDir($numPhone);
        if(!file_exists($this->workDir)){
            return $filename;
        }
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

        shell_exec("rm -rf $this->workDir/*;");
        file_put_contents($filename, $config);

        return $filename;
    }

    /**
     * Проверка на завершение работы приложения аутентификации.
     * @param $output
     * @return void
     */
    private function checkOutput($output):void
    {
        if(array_key_exists($output, $this->expectEnd)){
            if($this->expectEnd[$output] === true){
                $code   = 0;
                $status = TelegramProviderConf::STATUS_DONE;
            }else{
                $code   = 5;
                $status = TelegramProviderConf::STATUS_ERROR;
            }
            $this->updateStatus($status, $output);
            exit($code);
        }
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