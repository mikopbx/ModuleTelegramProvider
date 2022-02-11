<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */

namespace Modules\ModuleTelegramProvider\Lib;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use Phalcon\Mvc\Model\Resultset;

class TelegramProviderConf extends ConfigClass
{
    public const RGX_DIGIT_ONLY     = '/\D/';
    public const STATUS_FILE_NAME   = 'status.txt';
    public const STATUS_DONE        = 'Done';
    public const STATUS_ERROR       = 'Error';
    public const STATUS_WAIT_INPUT  = 'WaitInput';
    public const STATUS_WAIT_RESPONSE  = 'WaitTgResponse';
    public const STATUS_START_AUTH  = 'StartAuth';

    public const LINE_STATUS_OK     = 'OK';
    public const LINE_STATUS_FAIL   = 'FAIL';
    public const LINE_STATUS_WAIT   = 'WAIT_START';

    public const DTMF_PROCESS_TITLE = 'madeline-keyboard';

    /**
     * Receive information about mikopbx main database changes
     *
     * @param $data
     */
    public function modelsEventChangeData($data): void
    {
        if ($data['model'] === ModuleTelegramProvider::class){
            $this->startLauncher($data['recordId']);
        }
    }

    /**
     *  Process CoreAPI requests under root rights
     *  Запуск процесса авторизации:
     *  curl 'http://127.0.0.1/pbxcore/api/modules/ModuleTelegramProvider/start-auth?id=1'
     *  Запрос статуса авторизации:
     *  curl 'http://127.0.0.1/pbxcore/api/modules/ModuleTelegramProvider/status?id=1'
     *  Запрос статусов линий:
     *  curl 'http://127.0.0.1/pbxcore/api/modules/ModuleTelegramProvider/statuses'
     *  Ввод кода подтверждения:
     *  curl 'http://127.0.0.1/pbxcore/api/modules/ModuleTelegramProvider/enter-command?id=1&command=95248'
     *
     * @param array $request
     *
     * @return PBXApiResult
     */
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        $res    = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = strtoupper($request['action']);
        if($action === 'STATUS'){
            $res = $this->getStatus($request['data']['id']??'');
        }elseif($action === 'STATUSES'){
            $res = $this->getStatuses();
        }elseif($action === 'START-AUTH'){
            $res = $this->startAuth($request['data']['id']??'', $request['data']['type']??'');
        }elseif($action === 'ENTER-COMMAND'){
            $res = $this->enterCommand($request['data']['id']??'', $request['data']['command']??'', $request['data']['key']??'');
        }
        return $res;
    }

    /**
     * Передача приложению, ожидающему ввода, на вход строки.
     *
     * @param $id
     * @param $command
     * @param $key
     * @return PBXApiResult
     */
    public function enterCommand($id, $command, $key):PBXApiResult
    {
        $res = new PBXApiResult();
        if(empty($id)){
            return $res;
        }
        $settings = ModuleTelegramProvider::findFirst($id);
        if(!$settings){
            return $res;
        }
        $phone   = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
        if($key === 'bot'){
            $workDir = $this->moduleDir.'/'.dirname(TelegramAuth::BOT_SESSION_PATH);
        }elseif($key === 'user'){
            $workDir = $this->moduleDir.'/'.dirname(str_replace('$phone', $phone, TelegramAuth::PHONE_SESSION_TEMPLATE));
        }else{
            $workDir = $this->moduleDir.'/db/'.$phone;
        }
        $statusFile = "$workDir/".TelegramProviderConf::STATUS_FILE_NAME;
        $query      =  json_decode(file_get_contents($statusFile), true);
        if($query['status']??'' === self::STATUS_WAIT_INPUT){
            $query['data'] = $command;
            file_put_contents($statusFile, json_encode($query));
            $res->success = true;
        }
        return $res;
    }

    /**
     * Запуск процесса авторизации.
     * @param $id
     * @param $type
     * @return PBXApiResult
     */
    private function startAuth($id, $type):PBXApiResult
    {
        $res    = new PBXApiResult();
        if(empty($id)){
            $res->messages[] = 'Empty id';
            return $res;
        }
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst($id);
        if(!$settings){
            $res->messages[] = 'Settings not found';
            return $res;
        }
        $phone      = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
        $workDir    = $this->moduleDir.'/db/'.$phone;
        $statusFile = $workDir.'/'.self::STATUS_FILE_NAME;
        // Запускаем авторизацию.
        $phpPath = Util::which('php');
        $pid = Processes::getPidOfProcess("tg2sip -$id-");

        $delay = 0;
        $statusData = json_encode(['status'=> self::STATUS_START_AUTH, 'output' => 'CONF']);
        if(empty($pid) && strpos($type, 'gw' ) !== false){
            // Авторизация шлюза sip2tg.
            $delay = 30;
            file_put_contents($statusFile, $statusData);
            Processes::mwExecBg("$phpPath -f $this->moduleDir/bin/sip2tg-auth.php '$settings->phone_number'");
        }
        $pid = Processes::getPidOfProcess('madeline-auth-bot');
        if(empty($pid) && strpos($type, 'bot' ) !== false){
            $this->stopMadeLine();
            $sessionDir = $this->moduleDir.'/'.dirname(TelegramAuth::BOT_SESSION_PATH);
            $statusFile = $sessionDir.'/'.self::STATUS_FILE_NAME;
            shell_exec("rm -rf $sessionDir/*");
            Util::mwMkdir(dirname($statusFile));
            file_put_contents($statusFile, $statusData);
            // Авторизация для клиента телеграм.
            Processes::mwExecBg("$phpPath -f $this->moduleDir/bin/madeline-auth.php 'bot'");
        }
        $pid = Processes::getPidOfProcess("madeline-auth-$phone-user");
        if(empty($pid) && strpos($type, 'user' ) !== false){
            $this->stopMadeLine();
            $sessionDir = $this->moduleDir.'/'.dirname(str_replace('$phone', $phone, TelegramAuth::PHONE_SESSION_TEMPLATE));
            $statusFile = $sessionDir.'/'.self::STATUS_FILE_NAME;
            shell_exec("rm -rf $sessionDir");
            Util::mwMkdir(dirname($statusFile));
            file_put_contents($statusFile, $statusData);
            // Авторизация для бота телеграм.
            Processes::mwExecBg("$phpPath -f $this->moduleDir/bin/madeline-auth.php 'user' '$phone' $delay");
        }
        $res->success = true;
        return $res;
    }

    /**
     * Проверка статуса аутентификации.
     * @param $id
     * @return PBXApiResult
     */
    public function getStatus($id):PBXApiResult
    {
        $res    = new PBXApiResult();
        if(empty($id)){
            $res->messages[] = 'Empty id';
            return $res;
        }
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst($id);
        if(!$settings){
            $res->messages[] = 'Settings not found';
            return $res;
        }
        $phone      = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
        $statusPath = [
            'gw' => $this->moduleDir.'/db/'.$phone.'/'.self::STATUS_FILE_NAME,
            'user' => $this->moduleDir.'/'.dirname(str_replace('$phone', $phone, TelegramAuth::PHONE_SESSION_TEMPLATE)).'/'.self::STATUS_FILE_NAME,
            'bot' => $this->moduleDir.'/'.dirname(TelegramAuth::BOT_SESSION_PATH).'/'.self::STATUS_FILE_NAME
        ];
        $res->success = true;
        foreach ($statusPath as $key => $statusFile){
            if(file_exists($statusFile)){
                $res->data[$key] = json_decode(file_get_contents($statusFile), true);
            }else{
                $res->data[$key] = [];
            }
        }
        return $res;
    }

    /**
     * Возвращает статусы всех линий.
     * @return PBXApiResult
     */
    public function getStatuses():PBXApiResult
    {
        $res    = new PBXApiResult();
        $data = ModuleTelegramProvider::find();
        $data->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );

        $title = self::getProcessTitle();
        $statusBot = (strpos($title, "-bot") === false)?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK;
        foreach ($data as $settings) {
            $phone  = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
            $pid    = Processes::getPidOfProcess("tg2sip -$settings->id-");
            $statusAuth = $this->getStatus($settings->id);
            $statuses   = [
                'gw'     => (empty($pid))?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK,
                'user'   => (strpos($title, "-$phone") === false)?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK,
                'bot'    => $statusBot,
            ];
            foreach ($statusAuth->data as $key => $stateData){
                if($stateData['status'] !== self::STATUS_DONE){
                    $statuses[$key] = self::LINE_STATUS_FAIL;
                }
            }
            $res->data[$settings->id] = $statuses;
        }
        $res->success = true;
        return $res;
    }

    /**
     * Возвращает описание запущенного процесса.
     * @return string
     */
    public static function getProcessTitle():string
    {
        $path_ps   = Util::which('ps');
        $path_grep = Util::which('grep');
        $path_awk  = Util::which('awk');
        $pid        = getmypid();
        $out = shell_exec("$path_ps -A -o 'pid,args' | $path_grep ".self::DTMF_PROCESS_TITLE." | $path_grep -v grep | $path_grep -v '^$pid ' | $path_awk ' {print $3} '");
        return trim($out);
    }

    /**
     * Запуск sip2tg шлюза.
     * @return void
     */
    public function startSipTg():void{
        /** @var ModuleTelegramProvider $settings */
        $data = ModuleTelegramProvider::find();
        $data->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        foreach ($data as $settings){
            $numPhone   = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
            $workDir    = $this->moduleDir.'/db/'.$numPhone;
            $pid = Processes::getPidOfProcess("tg2sip -$settings->id-");
            if(!empty($pid)){
                continue;
            }
            $output = shell_exec("cd '$workDir'; /bin/busybox timeout 1 $this->moduleDir/bin/gen_db  /dev/null 2>&1");
            if(strpos($output, TelegramAuth::TEXT_AUTH_OK) !== false){
                $this->mwNohup("$this->moduleDir/bin/tg2sip '-$settings->id-'", $workDir);
            }
        }
    }

    /**
     * Запуск загрузочного скрипта.
     * @param $id
     * @return void
     */
    public function startLauncher($id):void
    {
        $workerPath = $this->moduleDir.'/bin/';
        $phpPath    = Util::which('php');
        Processes::mwExecBg("$phpPath -f $workerPath/sip2tg-launcher.php restart '$id'");
        Processes::mwExecBg("$phpPath -f $workerPath/madeline-dtmf-keyboard.php '$id'");
    }

    /**
     * Executes command exec() as background process.
     *
     * @param $command
     * @param $workdir
     */
    private function mwNohup($command, $workdir): void
    {
        $nohupPath = Util::which('nohup');
        $shPath    = Util::which('sh');
        $rmPath    = Util::which('rm');

        $filename = '/tmp/' . time() . '_nohup.sh';
        file_put_contents($filename, "{$rmPath} -rf {$filename}; cd {$workdir}; $nohupPath {$command}> /dev/null 2>&1 &");
        $noop_command = "{$nohupPath} {$shPath} {$filename} > /dev/null 2>&1 &";
        exec($noop_command);
    }

    /**
     * Остановка работы всех прокси.
     * @return void
     */
    public function stopSipTg():void{
        $ids = Processes::getPidOfProcess('tg2sip');
        if(!empty($ids)){
            shell_exec("killall tg2sip");
        }
    }

    public function stopMadeLine():void
    {
        $pid   = self::getProcessTitle();
        if(!empty($pid)){
            Processes::killByName($pid);
        }
    }

    /**
     * Добавление задач в crond.
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void
    {
        if ( ! is_array($tasks)) {
            return;
        }
        $workerPath   = $this->moduleDir.'/bin';
        $phpPath      = Util::which('php');
        $nohupPath    = Util::which('nohup');

        $tasks[]      = "*/1 * * * * $nohupPath $phpPath -f '$workerPath/sip2tg-launcher.php' > /dev/null 2> /dev/null &".PHP_EOL;
        $tasks[]      = "*/1 * * * * $nohupPath $phpPath -f '$workerPath/madeline-dtmf-keyboard.php' > /dev/null 2> /dev/null &".PHP_EOL;
    }

    /**
     * Process after disable action in web interface
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
        $this->stopSipTg();
        $this->stopMadeLine();
    }

    /**
     * Process after enable action in web interface
     *
     * @return void
     * @throws \Exception
     */
    public function onAfterModuleEnable(): void
    {
        $this->startSipTg();
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string
    {
        return  "\t".
                'same => n,Set(TG_PHONE=${PJSIP_HEADER(read,X-TG-Phone)})'.PHP_EOL."\t".
                'same => n,Set(TG_ID=${PJSIP_HEADER(read,X-TG-ID)})'.PHP_EOL."\t".
                'same => n,Set(TG_USER=${PJSIP_HEADER(read,X-TG-Username)})'.PHP_EOL."\t".
                'same => n,ExecIf($["${TG_PHONE}x" != "x"]?Set(CALLERID(num)=${TG_PHONE}))'.PHP_EOL."\t".
                'same => n,ExecIf($["${TG_USER}x" != "x" && "${TG_PHONE}x" == "x" ]?Set(CALLERID(num)=${TG_USER}))'.PHP_EOL."\t".
                'same => n,ExecIf($["${TG_ID}x" != "x" && "${TG_USER}x" == "x" && "${TG_PHONE}x" == "x" ]?Set(CALLERID(num)=${TG_ID}))'.PHP_EOL."\t".
                'same => n,AGI('.$this->moduleDir.'/agi-bin/saveSipHeadersInRedis.php)'.PHP_EOL;
    }

    /**
     * Возвращает полный путь к каталогу модуля.
     * @return string
     */
    public static function getModDir():string
    {
        $realpath = Util::which('realpath');
        return trim(shell_exec("$realpath ".__DIR__."/.."));
    }

}