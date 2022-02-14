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
use danog\MadelineProto\VoIP;
use Generator;

class TgUserEventHandler extends EventHandler
{
    private int $loopCount    = 0;
    private int $maxCountLoop = 10;
    public const MAX_TIMEOUT  = 90;
    private array $activeCalls= [];


    public function onLoop(){
        $this->loopCount ++;
        if($this->loopCount < $this->maxCountLoop){
            return;
        }
        $this->loopCount = 0;
        $this->maxCountLoop = random_int(50, self::MAX_TIMEOUT);
        if(!defined('MADELINE_BOT_ID')){
            return;
        }
        yield $this->getDialogs();
        yield $this->getSelf();

        $madeLineDir = TelegramProviderConf::getModDir().'/db/madeline';
        $fileState   = $madeLineDir.'/user-last-ping-state.txt';
        $query = 'PING:'.time();
        $result = yield $this->getResultsFromBot(MADELINE_BOT_ID, MADELINE_BOT_ID, $query);
        if(yield isset($result['_']) ){
            file_put_contents($fileState, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    }

    /**
     * В обработчике пытаемся перехватить сведения о воходящем звонке,
     * при поступлении звонка добавляем к чату бота
     * бот должен отправить клавиатуру DTMF пользователю.
     * @param $update
     * @return Generator|void
     * @throws \danog\MadelineProto\Exception
     */
    public function onUpdatePhoneCall($update) {
        $state =$update['phone_call']->getCallState();
        if( $state === VoIP::CALL_STATE_ENDED) {
            $callId  = $update['phone_call']->getCallID()['id'];
            $msgData = $this->activeCalls[$callId]??[];
            if(isset($msgData)){
                $id = '';
                foreach ($msgData['updates'] as $updateData){
                    if($updateData['_'] === 'updateMessageID'){
                        $id = $updateData["id"];
                        break;
                    }
                }
                if(!empty($id)){
                    $this->messages->deleteMessages(['revoke' => true, 'id' => [$msgData['updates'][0]["id"]]]);
                }
                unset($this->activeCalls[$callId]);
            }
        }elseif($state === VoIP::CALL_STATE_INCOMING){
            yield $this->sendKeyboard($update);
        }

    }

    /**
     * Отправка клавиатуры пользователю. с помощью inline бота.
     * @param array  $update
     * @return Generator
     */
    private function sendKeyboard(array $update): \Generator
    {
        $peer    = yield $this->getAPI()->getID($update);
        $Updates = [];
        $messages_BotResults = yield $this->getResultsFromBot($peer, MADELINE_BOT_ID, ''.time());
        $results = yield $messages_BotResults['results'];
        if(is_array($results) && count($results)>0){
            $msg = [
                'peer' => $peer,
                'query_id' => $messages_BotResults['query_id'],
                'id' => $messages_BotResults['results'][0]['id'],
            ];
            $Updates = yield $this->messages->sendInlineBotResult($msg);
            if(yield is_array($Updates)){
                $callId = $update['phone_call']->getCallID()['id'];
                $this->activeCalls[$callId] = $Updates;
            }
        }
        unset($Updates);
    }

    private function getResultsFromBot(int $peer, int $botId, string $query)
    {
        $params  = [
            'bot'   => $botId,
            'peer'  => $peer,
            'query' => $query,
            'offset'=> '0'
        ];
        return yield $this->messages->getInlineBotResults($params);
    }
}
