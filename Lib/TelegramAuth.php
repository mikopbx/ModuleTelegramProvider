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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use Phalcon\Mvc\Model\Resultset;
use Throwable;

class TelegramAuth extends WorkerBase
{
    public const   TEXT_ENTER_PHONE = 'Enter phone number:';
    public const   TEXT_AUTH_OK     = 'Authorization OK';

    private const  STDIN_NUM        = 0;
    private const  STDOUT_NUM       = 1;
    private const  STDERR_NUM       = 2;

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
            $enteredText = $this->login;
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
                $result =  json_decode(file_get_contents("$this->workDir/".TelegramProviderConf::STATUS_FILE_NAME), true);
                if($result['output'] !== $action){
                    break;
                }
                $enteredText = $result['data']??'';
            } while ($deltaTime <= $this->absTimeout && empty($enteredText));
        }catch (Throwable $e){
            Util::sysLogMsg(self::class, $e->getMessage());
        }

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
        if(empty($this->error)){
            $this->updateStatus(TelegramProviderConf::STATUS_DONE, '');
            $tg = new TelegramProviderConf();
            $tg->startLauncher();
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
        file_put_contents($statusFile, json_encode($query));
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
        $numPhone   = preg_replace('/[^0-9]/', '', $params);
        $title = 'gen_db_'.$numPhone;
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
        $this->updateStatus(TelegramProviderConf::STATUS_START_AUTH, '');
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
     * Создание конфиг файла.
     * @param $numPhone
     * @return string
     */
    private function makeSettingsFile($numPhone):string
    {
        $filename = '';
        $debugLvl = 6;
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst("phone_number='$this->login'");
        if(!$settings){
            return $filename;
        }
//        $settings->setHydrateMode(
//            Resultset::HYDRATE_OBJECTS
//        );

        $this->moduleDir  = trim(shell_exec('realpath '.__DIR__."/.."));
        $this->workDir    = $this->moduleDir.'/db/'.$numPhone;
        Util::mwMkdir($this->workDir, true);
        if(!file_exists($this->workDir)){
            return $filename;
        }
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