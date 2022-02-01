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
    public const STATUS_FILE_NAME   = 'status.txt';
    public const STATUS_DONE        = 'Done';
    public const STATUS_ERROR       = 'Error';
    public const STATUS_WAIT_INPUT  = 'WaitInput';
    public const STATUS_START_AUTH  = 'StartAuth';

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
            $res = $this->startAuth($request['data']['id']??'');
        }elseif($action === 'ENTER-COMMAND'){
            $res = $this->enterCommand($request['data']['id']??'', $request['data']['command']??'');
        }
        return $res;
    }

    /**
     * Передача приложению, ожидающему ввода, на вход строки.
     *
     * @param $id
     * @param $command
     * @return PBXApiResult
     */
    public function enterCommand($id, $command):PBXApiResult
    {
        $res = new PBXApiResult();
        if(empty($id)){
            return $res;
        }
        $settings = ModuleTelegramProvider::findFirst($id);
        // setHydrateMode
        if(!$settings){
            return $res;
        }
        $workDir    = $this->moduleDir.'/db/'.preg_replace('/[^0-9]/', '', $settings->phone_number);
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
     * @return PBXApiResult
     */
    private function startAuth($id):PBXApiResult
    {
        $res    = new PBXApiResult();
        if(empty($id)){
            $res->messages[] = 'Empty id';
            return $res;
        }
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst($id);
//        $settings->setHydrateMode(
//            Resultset::HYDRATE_OBJECTS
//        );
        if(!$settings){
            $res->messages[] = 'Settings not found';
            return $res;
        }
        $workDir    = $this->moduleDir.'/db/'.preg_replace('/[^0-9]/', '', $settings->phone_number);
        $statusFile = $workDir.'/'.self::STATUS_FILE_NAME;
        // Запускаем авторизацию.
        $pid = Processes::getPidOfProcess("tg2sip -$id-");
        if(empty($pid)){
            file_put_contents($statusFile, json_encode(['status'=> self::STATUS_START_AUTH, 'output' => 'CONF']));
            $phpPath = Util::which('php');
            Processes::mwExecBg("$phpPath -f $this->moduleDir/bin/TelegramAuthClient.php '$settings->phone_number'");
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
//        $settings->setHydrateMode(
//            Resultset::HYDRATE_OBJECTS
//        );
        if(!$settings){
            $res->messages[] = 'Settings not found';
            return $res;
        }
        $workDir    = $this->moduleDir.'/db/'.preg_replace('/[^0-9]/', '', $settings->phone_number);
        $statusFile = $workDir.'/'.self::STATUS_FILE_NAME;

        if(file_exists($statusFile)){
            $res->success = true;
            $res->data = json_decode(file_get_contents($statusFile), true);
        }else{
            $res->messages[] = 'Status file not found';
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
        foreach ($data as $settings) {
            $phone  = preg_replace('/[^0-9]/', '', $settings->phone_number);
            $pid    = Processes::getPidOfProcess("tg2sip -$settings->id-");
            $res->data[$settings->id] = [
                'status' => (empty($pid))?'FAIL':'OK',
                'phone'  => $phone,
            ];
        }
        $res->success = true;
        return $res;
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
            $numPhone   = preg_replace('/[^0-9]/', '', $settings->phone_number);
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
    public function startLauncher($id = ''):void
    {
        $workerPath = $this->moduleDir.'/bin/sip2tg-launcher.php';
        $phpPath    = Util::which('php');
        Processes::mwExecBg("$phpPath -f $workerPath restart {$id}");
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
        $workerPath = $this->moduleDir.'/bin/sip2tg-launcher.php';
        $phpPath        = Util::which('php');
        $tasks[]      = "*/1 * * * * {$phpPath} -f '$workerPath' > /dev/null 2> /dev/null".PHP_EOL;
    }

    /**
     * Process after disable action in web interface
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
        $this->stopSipTg();
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
        return  'same => n,Set(TG_PHONE=${PJSIP_HEADER(read,X-TG-Phone)})'.PHP_EOL.
                'same => n,Set(TG_ID=${PJSIP_HEADER(read,X-TG-ID)})'.PHP_EOL.
                'same => n,Set(TG_USER=${PJSIP_HEADER(read,X-TG-Username)})'.PHP_EOL.
                'same => n,ExecIf($["${TG_PHONE}x" != "x"]?Set(CALLERID(num)=${TG_PHONE}))'.PHP_EOL.
                'same => n,ExecIf($["${TG_USER}x" != "x" && "${TG_PHONE}x" == "x" ]?Set(CALLERID(num)=${TG_USER}))'.PHP_EOL.
                'same => n,ExecIf($["${TG_ID}x" != "x" && "${TG_USER}x" == "x" && "${TG_PHONE}x" == "x" ]?Set(CALLERID(num)=${TG_ID}))'.PHP_EOL;
    }
}