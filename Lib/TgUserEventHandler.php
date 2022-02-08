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

use danog\MadelineProto\EventHandler;
use Generator;

class TgUserEventHandler extends EventHandler
{
    /**
     * В обработчике пытаемся перехватить сведения о воходящем звонке,
     * при поступлении звонка добавляем к чату бота
     * бот должен отправить клавиатуру DTMF пользователю.
     * @param $update
     * @return Generator|void
     * @throws \danog\MadelineProto\Exception
     */
    public function onUpdatePhoneCall($update) {
        if($update['phone_call']->getCallState() !== \danog\MadelineProto\VoIP::CALL_STATE_INCOMING){
            // Звонки возможны только на пользователя.
            return;
        }
        $chatId     = yield $this->getAPI()->getID($update);
        yield $this->sendKeyboard($chatId, 1489312523, ''.time());
    }

    /**
     * Отправка клавиатуры пользователю. с помощью inline бота.
     * @param int    $peer
     * @param int    $botId
     * @param string $query
     * @return Generator
     */
    private function sendKeyboard(int $peer, int $botId, string $query): \Generator
    {
        $Updates = [];
        $params  = [
            'bot'   => $botId,
            'peer'  => $peer,
            'query' => $query,
            'offset'=> '0'
        ];
        $messages_BotResults = yield $this->messages->getInlineBotResults($params);
        $results = yield $messages_BotResults['results'];
        if(is_array($results) && count($results)>0){
            $msg = [
                'peer' => $peer,
                'query_id' => $messages_BotResults['query_id'],
                'id' => $messages_BotResults['results'][0]['id'],
            ];
            $Updates = yield $this->messages->sendInlineBotResult($msg);
        }
        unset($Updates);
    }
}
