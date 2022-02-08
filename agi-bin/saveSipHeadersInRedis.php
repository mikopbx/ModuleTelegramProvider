#!/usr/bin/php
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
use MikoPBX\Core\Asterisk\AGI;
use MikoPBX\Core\System\Util;
use Modules\ModuleTelegramProvider\Lib\AmiActions;

$agi    = new AGI();
$ID = $agi->get_variable('PJSIP_HEADER(read,X-TG-ID)', true);
if(!empty($ID)){
    $cacheAdapter = AmiActions::cacheAdapter();
    $data = [
        'X-TG-ID'       => $ID,
        'X-GW-Context'  => $agi->get_variable('PJSIP_HEADER(read,X-GW-Context)', true),
        'X-TG-Phone'    => $agi->get_variable('PJSIP_HEADER(read,X-TG-Phone)', true),
        'X-TG-Username' => $agi->get_variable('PJSIP_HEADER(read,X-TG-Username)', true),
        'channel'       => $agi->request['agi_channel']
    ];
    try {
        $cacheAdapter->set($ID, $data, 180);
    }catch (Throwable $e){
        Util::sysLogMsg('TG-PROVIDER', $e->getMessage());
    }
}