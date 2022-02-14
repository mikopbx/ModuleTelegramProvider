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
use Phalcon\Mvc\Model\Resultset;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;

class TgUserEventHandler extends EventHandler
{
    public const    MAX_TIMEOUT  = 90;

    private int     $loopCount    = 0;
    private int     $maxCountLoop = 10;
    private array   $activeCalls= [];
    private int     $botId = 0;

    /**
     * Инициализация.
     * @return void
     */
    public function onStart():void
    {
        $settings = ModuleTelegramProvider::find();
        $settings->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        /** @var ModuleTelegramProvider $setting */
        foreach ($settings as $setting){
            if(!empty($setting->botId)){
                $this->botId = $setting->botId;
                break;
            }
        }
    }

    public function onLoop(){
        $this->loopCount ++;
        if($this->loopCount < $this->maxCountLoop){
            return;
        }
        $this->loopCount = 0;
        $this->maxCountLoop = random_int(50, self::MAX_TIMEOUT);
        yield $this->getDialogs();
        yield $this->getSelf();

        $madeLineDir = TelegramProviderConf::getModDir().'/db/madeline';
        $fileState   = $madeLineDir.'/user-last-ping-state.txt';
        $query = 'PING:'.time();
        $result = yield $this->getResultsFromBot($this->botId, $this->botId, $query);
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
        if($this->botId === 0){
            return;
        }
        $state =$update['phone_call']->getCallState();
        if( $state === VoIP::CALL_STATE_ENDED) {
            yield $this->deleteKeyboard($update);
        }elseif($state === VoIP::CALL_STATE_INCOMING){
            yield $this->sendKeyboard($update);
        }

    }

    /**
     * Удаляет созданную ранее клавиатуру.
     * @param $update
     * @return Generator
     */
    private function deleteKeyboard($update):\Generator{
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
                yield $this->messages->deleteMessages(['revoke' => true, 'id' => [$msgData['updates'][0]["id"]]]);
            }
            unset($this->activeCalls[$callId]);
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
        $messages_BotResults = yield $this->getResultsFromBot($peer, $this->botId, ''.time());
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

    /**
     * Возвращает ответ от TG Бота.
     * @param int    $peer
     * @param int    $botId
     * @param string $query
     * @return Generator|mixed
     */
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
