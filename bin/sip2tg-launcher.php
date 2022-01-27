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

use MikoPBX\Core\System\Processes;
use MikoPBX\Modules\PbxExtensionUtils;
use Modules\ModuleTelegramProvider\Lib\TelegramProviderConf;

$tg = new TelegramProviderConf();
$moduleEnabled  = PbxExtensionUtils::isEnabled('ModuleTelegramProvider');
if($moduleEnabled === true){
    $action = $argv[1]??'';
    if($action === 'restart'){
        $id = trim($argv[2]??'');
        $title = 'tg2sip';
        if(!empty($id)){
            $title.= " -$id-";
        }
        $pid   = Processes::getPidOfProcess($title);
        if(!empty($pid)){
            // Останавливаем конкретный процесс.
            shell_exec("kill $pid");
            // Ожидаем завершения процессов.
            $ch = 0;
            do{
                $ch++;
                sleep(1);
                $pid   = Processes::getPidOfProcess($title);
            }while(!empty($pid) && $ch <= 15);
        }
    }
    $tg->startSipTg();
}else{
    $tg->stopSipTg();
}