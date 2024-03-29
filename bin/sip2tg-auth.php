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

namespace Modules\ModuleTelegramProvider\bin;
use Modules\ModuleTelegramProvider\Lib\TelegramAuth;
require_once 'Globals.php';

//define('TG_DRY_RUN', 1);
$phone =  $argv[1]??'';
$tgClient = new TelegramAuth();
$tgClient->sendAlertToBrowser(['status' => 'START_AUTH']);
$tgClient->start($phone);
$tgClient->startKeyboard($phone);
$tgClient->sendAlertToBrowser(['status' => 'END_AUTH']);
