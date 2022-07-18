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
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Storage\SerializerFactory;
use Phalcon\Cache\Adapter\Redis;

class AmiActions
{
    public const REDIS_PREFIX       = 'tg_provider_';

    /**
     * Отправляет DTMF на указанный канал.
     * @param string $channel
     * @param string $dtmf
     * @return void
     */
    public static function SendDtmf(string $channel, string $dtmf):void
    {
        if(empty($channel) || empty($dtmf)){
            return;
        }
        $am         = Util::getAstManager();
        $dtmfString = str_split($dtmf);
        foreach ($dtmfString as $code){
            $am->sendRequestTimeout('PlayDTMF', ['Digit' => $code, 'Channel' => $channel, 'Receive' => 1, 'Duration' => 200]);
        }
    }

    /**
     * Возвращает адаптер для подключения к Redis.
     * @return Redis
     */
    public static function cacheAdapter():Redis
    {
        $serializerFactory = new SerializerFactory();
        $di     = Di::getDefault();
        $options = [
            'defaultSerializer' => 'Json',
            'lifetime'          => 300,
            'index'             => 3,
            'prefix'            => self::REDIS_PREFIX
        ];
        if($di !== null){
            $config          = $di->getShared(ConfigProvider::SERVICE_NAME);
            $options['host'] = $config->path('redis.host');
            $options['port'] = $config->path('redis.port');
        }
        return (new Redis($serializerFactory, $options));
    }
}