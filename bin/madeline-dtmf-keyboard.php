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

require_once 'Globals.php';
require_once __DIR__.'/../vendor/autoload.php';
use danog\MadelineProto\API;
use MikoPBX\Core\System\Util;
use Phalcon\Mvc\Model\Resultset;
use Modules\ModuleTelegramProvider\Lib\BotEventHandler;
use Modules\ModuleTelegramProvider\Lib\TelegramProviderConf;
use Modules\ModuleTelegramProvider\Lib\TgUserEventHandler;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use Modules\ModuleTelegramProvider\Lib\TelegramAuth;
use danog\MadelineProto\Shutdown;
use MikoPBX\Core\System\Processes;

$fileState   = TelegramProviderConf::getModDir().'/db/madeline/user-last-ping-state.txt';
$res         = stat($fileState);
$mtime       = ($res === false)?0:$res['mtime'];

$authPid     = Processes::getPidOfProcess('madeline-auth-');
if(!empty($authPid)){
    if((time() - $mtime) < (TgUserEventHandler::MAX_TIMEOUT + 30) ){
        die('The authorization process has been started. The start of the service is not possible.');
    }
    // Пинг не прошел,  шужен рестрат.
    Processes::killByName($authPid);
}

$pid      = TelegramProviderConf::getProcessTitle();
$settings = ModuleTelegramProvider::find();
$settings->setHydrateMode(
    Resultset::HYDRATE_OBJECTS
);
if(!empty($pid)){
    $needRestart = false;
    foreach ($settings as $setting){
        if(!empty($setting->botId)){
            $needRestart = (strpos($pid, 'bot') === false|| $needRestart);
        }
        $phone  = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $setting->phone_number);
        $needRestart = (strpos($pid, $phone) === false || $needRestart);
    }
    if($needRestart){
        Processes::killByName($pid);
    }else{
        die('There is another active process... '.$pid.PHP_EOL);
    }
}
$modDir        = TelegramProviderConf::getModDir();
$MadelineProto = [];
$handlers      = [];
$apiSettings   = TelegramAuth::messengerInitSettings();

$botId = 0;
$title = TelegramProviderConf::DTMF_PROCESS_TITLE;
/** @var ModuleTelegramProvider $setting */
foreach ($settings as $setting){
    if(!empty($setting->botId)){
        $botId = $setting->botId;
    }
    $phone       = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $setting->phone_number);
    $sessionName =  TelegramProviderConf::getModDir().'/'.str_replace('$phone', $phone, TelegramAuth::PHONE_SESSION_TEMPLATE);
    if(!file_exists($sessionName)){
        continue;
    }
    $title.="-$phone";
    $MadelineProto []= new API($sessionName, $apiSettings);
    $handlers      []= TgUserEventHandler::class;
}

/*
 * Добавляем бота.
 */
$sessionName     = $modDir."/".TelegramAuth::BOT_SESSION_PATH;
if(!empty($botId) && file_exists($sessionName)){
    $title.="-bot";
    $MadelineProto []= new API($sessionName, $apiSettings);
    $handlers      []= BotEventHandler::class;
}

$id = Shutdown::addCallback(static function () use ($MadelineProto) {
    /** @var API $Api */
    foreach ($MadelineProto as $Api){
        $Api->__destruct();
    }
});

if(!empty($MadelineProto)){
    try {
        cli_set_process_title($title);
        API::startAndLoopMulti($MadelineProto, $handlers);
    }catch (Throwable $e){
        Util::sysLogMsg('DTMF BOT', $e->getMessage());
    }
}
