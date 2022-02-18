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
use MikoPBX\Common\Models\ExternalPhones;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;

class TgUserEventHandler extends EventHandler
{
    public const    MAX_TIMEOUT  = 90;

    private int     $loopCount    = 0;
    private int     $maxCountLoop = 10;
    private array   $activeCalls= [];
    private int     $botId = 0;
    private int     $myId  = 0;

    /**
     * Инициализация.
     * @return void
     */
    public function onStart():void
    {
        $this->myId = $this->getAPI()->getSelf()['id'];
        $settings   = ModuleTelegramProvider::find();
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
        if(yield $result ){
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
        if($state === VoIP::CALL_STATE_INCOMING){
            yield $this->sendKeyboard($update);
        }

    }

    /**
     * Удаляет созданную ранее клавиатуру.
     * @param $update
     * @return Generator
     */
    private function deleteKeyboard($update):\Generator{
        $callId  = $update['message']["action"]["call_id"];
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
     * @param array   $update
     * @param string  $query
     * @return Generator
     */
    private function sendKeyboard(array $update, string $query = ''): \Generator
    {
        $userData = yield $this->users->getUsers(['id' => [$update["message"]["peer_id"]["user_id"]]]);
        if(yield $userData){
            if($query===''){
                $query = ''.time();
            }
            $data = json_encode([
                                    'login' => $this->getAPI()->getSelf()['phone'],
                                    'query' => $query,
                                    'phone' => $userData[0]['phone']??'',
                                    'username' => $userData[0]['username']??'',
                                    'id' => $userData[0]['id']??'',
                                ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

            $peer    = yield $this->getAPI()->getID($update);
            $responseData = [];
            $messages_BotResults = yield $this->getResultsFromBot($peer, $this->botId, $data);
            $results = yield $messages_BotResults['results'];
            if((yield $results) && count($results)>0){
                $msg = [
                    'peer' => $peer,
                    'query_id' => $messages_BotResults['query_id'],
                    'id' => $messages_BotResults['results'][0]['id'],
                ];
                $responseData = yield $this->messages->sendInlineBotResult($msg);
                if(isset($update['phone_call']) && yield is_array($responseData)){
                    $callId = $update['phone_call']->getCallID()['id'];
                    $this->activeCalls[$callId] = $responseData;
                }
            }
            unset($responseData);
        }
    }

    public function onAny($update)
    {
        $reason = $update['message']["action"]["reason"]['_']??'';
        $fromId = $update['message']["from_id"]["user_id"]??0;
        if($reason === 'phoneCallDiscardReasonHangup' && $this->myId !== $fromId){
            yield $this->deleteKeyboard($update);
        }elseif($reason === 'phoneCallDiscardReasonMissed' && $this->myId === $fromId){
            yield $this->messages->deleteMessages(['revoke' => true, 'id' => [$update['message']["id"]]]);
            yield $this->sendKeyboard($update, 'callback');
        }
    }

    /**
     * Handle updates from users.
     *
     * @param array $update Update
     *
     */
    public function onUpdateNewMessage(array $update):\Generator
    {
        if ($update['message']['_'] !== 'updateNewMessage'
            && !$update['message']['out'] && isset($update['message']['user_id'])) {
            $result = BotEventHandler::sendDTMF($update['message'], $update['message']['message']);
            if($result){
                // Это успешная отправка DTMF.
                // Очистим сообщение - примем ввод.
                yield $this->messages->deleteMessages(['revoke' => true, 'id' => [$update['message']["id"]]]);
            }
        }
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

    private function updateStatuses(): \Generator{
        $statuses = yield $this->contacts->getStatuses();
        if(yield $statuses){
            $id = [];
            foreach ($statuses as $stateData){
                if(in_array($stateData['_'], ['userStatusOffline', 'userStatusLastWeek']) ){
                    continue;
                }
                $id[] = $stateData['user_id'];
            }
            $users = yield $this->users->getUsers(['id' => $id]);
            if(yield $users){
                $onlineUsers = [];
                /** @var ExternalPhones $extPhone */
                $externalPhones = ExternalPhones::find();
                $externalPhones->setHydrateMode(
                    Resultset::HYDRATE_OBJECTS
                );
                $mobilePhones = [];
                foreach ($externalPhones as $extPhone){
                    if(strlen($extPhone->dialstring) > 10){
                        $mobilePhones[substr($extPhone->dialstring, -10)] = $extPhone->dialstring;
                    }
                }
                unset($externalPhones);
                foreach ($users as $user){
                    $key = substr($user['phone'], -10);
                    if(isset($mobilePhones[$key])){
                        $onlineUsers[] = $user;
                    }
                }
                unset($mobilePhones);
            }
        }
    }
}
