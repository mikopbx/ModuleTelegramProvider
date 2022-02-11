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
use Modules\ModuleTelegramProvider\Lib\TelegramAuth;

//define('TG_DRY_RUN', 1);

$type  = $argv[1]??'';
$phone = $argv[2]??'';
$delay = $argv[3]??'';
if($type === 'bot'){
    cli_set_process_title('madeline-auth-bot');
    $tg = new TelegramAuth();
    $tg->messengerBotLogin();
}elseif ($type === 'user' && !empty($phone)){
    if(is_numeric($delay)){
        sleep(1*$delay);
    }
    cli_set_process_title("madeline-auth-$phone-user");
    $tg = new TelegramAuth();
    $tg->messengerLogin($phone);
}