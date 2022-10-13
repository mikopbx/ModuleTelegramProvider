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

    /**
     * Receive information about mikopbx main database changes
     *
     * @param $data
     */
    public function modelsEventChangeData($data): void
    {
        if ($data['model'] === ModuleTelegramProvider::class){
            $this->startLauncher($data['recordId']);
            $this->makeAuthFiles();
        }
    }

    /**
     * @return void
     */
    private function makeAuthFiles():void
    {
        /** @var ModuleTelegramProvider $settings */
        $settings = ModuleTelegramProvider::findFirst();
        if(!$settings){
            return;
        }
        $baseDir = '/var/etc/auth';
        if(!file_exists($baseDir)){
            Util::mwMkdir($baseDir, true);
        }
        $authFile = $baseDir.'/'.basename($settings->api_hash);
        if(!file_exists($authFile)){
            $grepPath   = Util::which('grep');
            $cutPath    = Util::which('cut');
            $xargs      = Util::which('xargs');
            $tokenHash  = md5(ModuleTelegramProvider::class);
            Processes::mwExec("$grepPath -Rn '$tokenHash' /var/etc/auth | $cutPath -d ':' -f 1 | $xargs rm -rf ");
            file_put_contents($authFile, $tokenHash);
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
        }elseif($action === 'LOGOUT'){
            $res = $this->logout($request['data']['id']??'', $request['data']['phone']??'');
        }elseif($action === 'START-AUTH'){
            $res = $this->startAuth($request['data']['id']??'', $request['data']['type']??'');
        }elseif($action === 'ENTER-COMMAND'){
            $res = $this->enterCommand($request['data']['login']??'', $request['data']['command']??'', $request['data']['key']??'');
        }
        return $res;
    }

    private function logout(string $id, string $phone):PBXApiResult
    {
        $res = new PBXApiResult();
        self::killByTittle("tg2sip -$id-", true);
        self::killByTittle("td-keyboard=$id-", true);
        $numPhone   = preg_replace(self::RGX_DIGIT_ONLY, '', $phone);
        if(!empty($numPhone)){
            $rmPath = Util::which('rm');
            shell_exec("$rmPath -rf '$this->moduleDir/db/$numPhone' '$this->moduleDir/db/keyboard/$numPhone'");
        }
        if(!file_exists("$this->moduleDir/db/$numPhone")
           && !file_exists("$this->moduleDir/db/keyboard/$numPhone")){
            $res->success = true;
        }
        return $res;
    }

    public static function killByTittle($title, bool $force = false):void
    {
        $pid   = Processes::getPidOfProcess($title);
        if(!empty($pid)){
            $options = '';
            if($force){
                $options = '-9';
            }
            // Останавливаем конкретный процесс.
            shell_exec("kill $options $pid > /dev/null 2> /dev/null");
            // Ожидаем завершения процессов.
            $ch = 0;
            do{
                $ch++;
                sleep(1);
                $pid   = Processes::getPidOfProcess($title);
            }while(!empty($pid) && $ch <= 15);
        }

    }

    /**
     * Передача приложению, ожидающему ввода, на вход строки.
     *
     * @param $id
     * @param $command
     * @param $key
     * @return PBXApiResult
     */
    public function enterCommand($login, $command, $key):PBXApiResult
    {
        $res = new PBXApiResult();
        $isFail = false;
        if(empty($login)){
            $isFail = true;
        }
        $settings = ModuleTelegramProvider::findFirst("phone_number='$login'");
        if(!$settings){
            $isFail = true;
        }
        $phone   = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
        $workDir = $this->moduleDir.'/db/'.$phone;
        if($key === 'user'){
            $workDir = $this->moduleDir.'/db/keyboard/'.$phone;
        }elseif($key !== 'gw'){
            $isFail = true;
        }
        if($isFail){
            return $res;
        }
        $statusFile = "$workDir/".TelegramProviderConf::STATUS_FILE_NAME;
        $query      = json_decode(file_get_contents($statusFile), true, 512, JSON_THROW_ON_ERROR);
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

        $statusData = json_encode(['status'=> self::STATUS_START_AUTH, 'output' => 'CONF']);
        if(empty($pid) && strpos($type, 'gw' ) !== false){
            // Авторизация шлюза sip2tg.
            file_put_contents($statusFile, $statusData);
            Processes::mwExecBg("$phpPath -f $this->moduleDir/bin/sip2tg-auth.php '$settings->phone_number'");
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
            'gw'    => $this->moduleDir.'/db/'.$phone.'/'.self::STATUS_FILE_NAME,
            'user'  => $this->moduleDir.'/'.str_replace('$phone', $phone, TelegramAuth::PHONE_SESSION_TEMPLATE).'/'.self::STATUS_FILE_NAME,
            'bot'   => $this->moduleDir.'/'.str_replace('$phone', 'bot', TelegramAuth::PHONE_SESSION_TEMPLATE).'/'.self::STATUS_FILE_NAME
        ];
        $res->success = true;
        foreach ($statusPath as $key => $statusFile){
            if(file_exists($statusFile)){
                $res->data[$key] = json_decode(file_get_contents($statusFile), true, 512, JSON_THROW_ON_ERROR);
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

        $pidBot = Processes::getPidOfProcess("td-keyboard=bot");
        foreach ($data as $settings) {
            $pid    = Processes::getPidOfProcess("tg2sip -$settings->id-");
            $pidUser= Processes::getPidOfProcess("td-keyboard=$settings->id-");

            $statusAuth = $this->getStatus($settings->id);
            $statuses   = [
                'gw'     => (empty($pid))?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK,
                'user'   => (empty($pidUser))?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK,
                'bot'    => (empty($pidBot))?self::LINE_STATUS_WAIT:self::LINE_STATUS_OK,
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
            $output = shell_exec("cd '$workDir'; /bin/busybox timeout 2 $this->moduleDir/bin/gen_db  /dev/null 2>&1");
            if(strpos($output, TelegramAuth::TEXT_AUTH_OK) !== false){
                $this->mwNohup("$this->moduleDir/bin/tg2sip '-$settings->id-'", $workDir);
            }
        }
    }

    /**
     * Старт keyboard tg agent
     * @return void
     */
    public function startTdKeyboard():void
    {
        /** @var ModuleTelegramProvider $settings */
        $data = ModuleTelegramProvider::find();
        $data->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );

        // Запуск бота отдельным процессом.
        $idBot = "td-keyboard=bot-";
        $pidBot = Processes::getPidOfProcess($idBot);
        $botConf = "$this->moduleDir/db/keyboard/bot/settings.conf";

        foreach ($data as $settings){
            $auth = new TelegramAuth();
            $confFile = $auth->makeSettingsKeyboardFile($settings->phone_number);

            $numPhone   = preg_replace(self::RGX_DIGIT_ONLY, '', $settings->phone_number);
            // Запуск телеграмм клиент.
            $idTask = "td-keyboard=$settings->id-";
            $pid = Processes::getPidOfProcess($idTask);
            if(!empty($pid) || !file_exists($confFile)){
                continue;
            }
            $program = "$this->moduleDir/bin/td-keyboard -u -c=$this->moduleDir/db/keyboard/$numPhone/settings.conf $idTask";
            Processes::mwExecBg($program);
        }
        if(empty($pidBot) && file_exists($botConf)){
            $program = "$this->moduleDir/bin/td-keyboard -c=$botConf $idBot";
            Processes::mwExecBg($program);
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
        $timePath  = Util::which('timeout');

        $result_code = trim(shell_exec("cd {$workdir}; $timePath -s SIGSYS 3 {$command}; echo \$?"));
        if(strpos($result_code, "TG client connected") !== false){
            $result_code = '0';
        }
        $result_code = is_numeric($result_code)?1*$result_code:-1;

        if($result_code !==0 && $result_code !== 159){
            // 159 - Bad system call, так sip2tg реагирует на сигнал SIGSYS.
            // 0 - возвращается не регулярно при отправке SIGTERM, потому не используем его.
            Util::sysLogMsg(self::class, 'Error start sip2tg...');
            return;
        }
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
     * Остановка работы всех прокси.
     * @return void
     */
    public function stopTdKeyboard():void{
        $ids = Processes::getPidOfProcess('td-keyboard');
        if(!empty($ids)){
            shell_exec("kill $ids");
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
    }

    /**
     * Process after disable action in web interface
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
        $this->stopSipTg();
        $this->stopTdKeyboard();
    }

    /**
     * This module's method calls after the asterisk service started
     */
    public function onAfterPbxStarted(): void
    {
        $this->makeAuthFiles();
    }

    /**
     * Process after enable action in web interface
     *
     * @return void
     * @throws \Exception
     */
    public function onAfterModuleEnable(): void
    {
        $tg = new TelegramProviderConf();
        $tg->startTdKeyboard();
        $tg->startSipTg();
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
                'same => n,ExecIf($["${TG_ID}x" != "x"]?Wait(1))'.PHP_EOL."\t".
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