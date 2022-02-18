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

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Core\System\Util;
use danog\MadelineProto\EventHandler;
use MikoPBX\Common\Models\PbxSettings;
use Modules\ModuleTelegramProvider\Models\ModuleTelegramProvider;
use Phalcon\Mvc\Model\Resultset;
use MikoPBX\Common\Models\Sip;

class BotEventHandler extends EventHandler
{
    private int     $loopCount = 0;
    private int  $maxCountLoop = 100;
    private array $translates    = [];
    private string  $businessCardText = '';
    private string  $keyboardText     = '';
    private string  $callbackQueue    = '';
    private string  $queueId          = '';
    private string  $queueNum         = '';
    private array   $prefixes         = [];

    /**
     * Инициализация.
     * @return void
     */
    public function onStart():void
    {
        $providers = Sip::find("host='127.0.0.1'");
        $providers->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        $idProviders = [];
        /** @var Sip $provider */
        foreach ($providers as $provider){
            $idProviders[$provider->port] = $provider->uniqid;
        }
        $idRoutes = [];
        $routes   = OutgoingRoutingTable::find();
        $routes->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        /** @var OutgoingRoutingTable $route */
        foreach ($routes as $route){
            $idRoutes[$route->providerid] = $route->numberbeginswith;
        }


        $settings   = ModuleTelegramProvider::find();
        $settings->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        /** @var ModuleTelegramProvider $setting */
        foreach ($settings as $setting){
            if(!empty($setting->botId)){
                $this->businessCardText = $setting->businessCardText;
                $this->keyboardText     = $setting->keyboardText;
                $this->callbackQueue    = $setting->callbackQueue;
            }
            $login = preg_replace(TelegramProviderConf::RGX_DIGIT_ONLY, '', $setting->phone_number);
            $this->prefixes[$login] = $idRoutes[$idProviders[30000 + $setting->id]??'']??'';
        }
        /** @var CallQueues $queue */
        $queues = CallQueues::find("id='$this->callbackQueue'");
        $queues->setHydrateMode(
            Resultset::HYDRATE_OBJECTS
        );
        foreach ($queues as $queue){
            $this->queueId  = $queue->uniqid;
            $this->queueNum = $queue->extension;
        }

    }

    /**
     * Подключаем переводы.
     * @param $key
     * @return mixed
     */
    private function translate($key)
    {
        if(empty($this->translates)){
            $language = PbxSettings::getValueByKey('WebAdminLanguage');
            try {
                $this->translates = include TelegramProviderConf::getModDir() . "/Messages/{$language}.php";
            }catch (\Throwable $e){
                Util::sysLogMsg(__CLASS__, $e->getMessage());
            }
        }
        return $this->translates[$key]??$key;
    }

    /**
     * Метод вызывается каждую секунду.
     * Для поддержания сессии вызываем getDialogs.
     * @return \Generator|void
     */
    public function onLoop(){
        $this->loopCount ++;
        if($this->loopCount < $this->maxCountLoop){
            return;
        }
        $this->loopCount = 0;
        try {
            $this->maxCountLoop = random_int(60, TgUserEventHandler::MAX_TIMEOUT);
        }catch (\Throwable $e){
            $this->maxCountLoop = 60;
        }
        yield $this->getDialogs();
    }

    /**
     * @param $update
     * @return \Generator|void
     */
    public function onAny($update)
    {
        if('updateBotInlineQuery' === $update['_']){
            if(strpos($update['query'], 'PING:') !== false){
                yield $this->sendPong($update);
                return;
            }
            $data   = json_decode($update['query'],true);
            $query  = $data['query']??'';
            if ($query === 'callback'){
                $params = $this->getCallbackKeyboardMessage($update, $data);
            }else{
                $params = $this->getDtmfKeyboardMessage($update);
            }
            yield $this->messages->setInlineBotResults($params);
        }elseif ('updateInlineBotCallbackQuery' === $update['_']) {
            $bytes = $update['data']->__toString();
            if(strpos($bytes, 'callback') !== false){
                $qData = explode(':',$bytes);
                $this->startCallback($qData[1]??'', $qData[2]??'');
            }else{
                self::sendDTMF($update, $bytes);
            }
        }
    }

    /**
     * Отправка ответа на PING
     * @param $update
     * @return \Generator
     */
    private function sendPong($update):\Generator
    {
        $params  = [
            'query_id' => $update['query_id'],
            'results' => [
                [
                    '_' => 'inputBotInlineResult',
                    'id' => '1',
                    'type' => 'article',
                    'title' => 'PONG:'.time(),
                    'send_message' => [
                        '_' => 'inputBotInlineMessageText',
                        'no_webpage' => true,
                        'message' => 'PONG:'.time(),
                    ]
                ],
            ],
            'cache_time' => 1,
        ];
        $result = yield $this->messages->setInlineBotResults($params);
        if( yield $result ){
            $madeLineDir = TelegramProviderConf::getModDir().'/db/madeline';
            $fileState   = $madeLineDir."/user-last-ping-state.txt";
            file_put_contents($fileState, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

    }

    /**
     * Отправка через AMI dtmf
     * @param $update
     * @param $bytes
     * @return bool
     */
    public static function sendDTMF($update, $bytes):bool
    {
        if(empty($bytes) && is_numeric($bytes)){
            return false;
        }
        $user         = $update['user_id'];
        $cacheAdapter = AmiActions::cacheAdapter();
        try {
            $cache = $cacheAdapter->get($user);
        }catch (\Throwable $e){
            $cache = false;
        }
        if($cache && !empty($cache->channel)){
            AmiActions::SendDtmf($cache->channel, $bytes);
        }
        return ($cache !== false);
    }

    /**
     * Полоучение параметров для отправки формы заказа обратного звонка.
     * @param $update
     * @param $query
     * @return array
     */
    private function getCallbackKeyboardMessage($update,$query):array
    {
        $phone = $query['phone']??'';
        if(empty($phone)){
            $phone = $query['username']??$query['id'];
        }

        $replyKeyboardMarkup = [
            '_' => 'replyInlineMarkup',
            'resize' => false,
            'single_use' => true,
            'selective' => true,
            'rows' => [
                ['_' => 'keyboardButtonRow', 'buttons' => [
                    ['_' => 'keyboardButtonCallback', 'text' => $this->translate('request a call back'), 'data' => "callback:$phone:{$query['login']}", 'requires_password' => false],
                ]
                ],
            ]
        ];

        $message = (empty($this->businessCardText))?$this->translate('К сожалению мы до Вас не дозвонились. Заказать обратный звонок можно по кнопке ниже'):$this->businessCardText;
        return [
            'query_id' => $update['query_id'],
            'results' => [
                [
                    '_' => 'inputBotInlineResult',
                    'id' => '1',
                    'type' => 'article',
                    'title' => $this->translate('Ordering a callback'),
                    'send_message' => [
                        '_' => 'inputBotInlineMessageText',
                        'no_webpage' => true,
                        'message' => $message,
                        'reply_markup' => $replyKeyboardMarkup
                    ]
                ],
            ],
            'cache_time' => 1,
        ];
    }

    /**
     * Получение параметров для отправки формы клавиатуря для ввода добавочного номера.
     * @param $update
     * @return array
     */
    private function getDtmfKeyboardMessage($update):array
    {
        $replyKeyboardMarkup = [
            '_' => 'replyInlineMarkup',
            'resize' => false,
            'single_use' => true,
            'selective' => true,
            'rows' => [
                ['_' => 'keyboardButtonRow', 'buttons' => [
                    ['_' => 'keyboardButtonCallback', 'text' => '1', 'data' => '1', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '2', 'data' => '2', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '3', 'data' => '3', 'requires_password' => false],
                ]
                ],
                ['_' => 'keyboardButtonRow', 'buttons' => [
                    ['_' => 'keyboardButtonCallback', 'text' => '4', 'data' => '4', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '5', 'data' => '5', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '6', 'data' => '6', 'requires_password' => false],
                ]
                ],
                ['_' => 'keyboardButtonRow', 'buttons' => [
                    ['_' => 'keyboardButtonCallback', 'text' => '7', 'data' => '7', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '8', 'data' => '8', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '9', 'data' => '9', 'requires_password' => false],
                ]
                ],
                ['_' => 'keyboardButtonRow', 'buttons' => [
                    ['_' => 'keyboardButtonCallback', 'text' => '*', 'data' => '*', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '0', 'data' => '0', 'requires_password' => false],
                    ['_' => 'keyboardButtonCallback', 'text' => '#', 'data' => '#', 'requires_password' => false],
                ]
                ],
            ]
        ];
        $message = (empty($this->keyboardText))?$this->translate("Enter the employee's internal number"):$this->keyboardText;
        return [
            'query_id' => $update['query_id'],
            'results' => [
                [
                    '_' => 'inputBotInlineResult',
                    'id' => '1',
                    'type' => 'article',
                    'title' => $this->translate('Internal number entry form'),
                    'send_message' => [
                        '_' => 'inputBotInlineMessageText',
                        'no_webpage' => true,
                        'message' => $message,
                        'reply_markup' => $replyKeyboardMarkup
                    ]
                ],
            ],
            'cache_time' => 1,
        ];
    }

    /**
     * Запуск обратного звонка.
     * @param $dst
     * @return void
     */
    private function startCallback($dst, $login):void
    {
        if(empty($this->queueNum) || empty($this->queueId)){
           return;
        }
        $prefix = $this->prefixes[$login]??'';
        $channel  = "Local/{$this->queueNum}@internal-originate";
        $variable = "pt1c_cid=$prefix{$dst},SRC_QUEUE={$this->queueId}";
        $am       = Util::getAstManager('off');
        $am->Originate($channel, "$prefix{$dst}", 'all_peers', '1', null, null, null, null, $variable, null, true);
    }
}