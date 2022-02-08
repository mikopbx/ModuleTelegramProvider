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
use Modules\ModuleTelegramProvider\Lib\BotEventHandler;
use Modules\ModuleTelegramProvider\Lib\TgUserEventHandler;

$MadelineProto=[];
$MadelineProto []= new API('bot.madeline');
$MadelineProto []= new API('session.madeline');

$handlers    = [];
$handlers      []= BotEventHandler::class;
$handlers      []= TgUserEventHandler::class;

try {
    API::startAndLoopMulti($MadelineProto, $handlers);
}catch (Throwable $e){
    Util::sysLogMsg('DTMF BOT', $e->getMessage());
}