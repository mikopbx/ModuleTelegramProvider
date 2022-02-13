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
use MikoPBX\Core\System\Util;

class BotEventHandler extends EventHandler
{
    private int     $loopCount = 0;
    private int  $maxCountLoop = 100;

    public function onLoop(){
        $this->loopCount ++;
        if($this->loopCount < $this->maxCountLoop){
            return;
        }
        $this->loopCount = 0;
        $this->maxCountLoop = random_int(60, TgUserEventHandler::MAX_TIMEOUT);
        yield $this->getDialogs();
    }

    /**
     * Handle updates from users.
     *
     * @param array $update Update
     *
     */
    public function onUpdateNewMessage(array $update):void
    {
        if($this->getAPI()->getSelf()['bot'] === false){
            // Автоответ должен работать только для сообщений, отправленных боту.
            return;
        }
        if ($update['message']['_'] !== 'updateNewMessage' || $update['message']['out'] ?? false) {
            // Пустое сообщение.
            return;
        }
    }

    public function sendKeyboard($update)
    {
        // Отправляем клавиатуру, это сообщение боту.
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
            ]
        ];
        $params  = [
            'noforwards'    => true,
            'peer'          => yield $this->getAPI()->getID($update),
            'message'  => 'Last PING from BOT: '.Util::getNowDate(),
            'reply_markup'  => $replyKeyboardMarkup,
        ];
        yield $this->messages->sendMessage($params);

    }

    /**
     * Обработкик позволяет перехватить нажатие кнопок inline клавиатуры.
     * @param $update
     */
    public function onAny($update)
    {
        if('updateBotInlineQuery' === $update['_']){
            if(strpos($update['query'], 'PING:') !== false){
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
                if( yield isset($result['_']) ){
                    $madeLineDir = TelegramProviderConf::getModDir().'/db/madeline';
                    $fileState   = $madeLineDir."/user-last-ping-state.txt";
                    file_put_contents($fileState, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
                }
                return;
            }
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
            $params  = [
                'query_id' => $update['query_id'],
                'results' => [
                    [
                        '_' => 'inputBotInlineResult',
                        'id' => '1',
                        'type' => 'article',
                        'title' => 'DTMF keyboard',
                        'send_message' => [
                            '_' => 'inputBotInlineMessageText',
                            'no_webpage' => true,
                            'message' => 'Send DTMF code',
                            'reply_markup' => $replyKeyboardMarkup
                        ]
                    ],
                ],
                'cache_time' => 1,
            ];
            yield $this->messages->setInlineBotResults($params);
        }elseif ('updateInlineBotCallbackQuery' === $update['_']) {
            $bytes = $update['data']->__toString();
            if(empty($bytes)){
                return;
            }
            $user  = $update['user_id'];
            $cacheAdapter = AmiActions::cacheAdapter();
            try {
                $cache = $cacheAdapter->get($user);
            }catch (\Throwable $e){
                $cache = false;
            }
            if($cache && !empty($cache->channel)){
                AmiActions::SendDtmf($cache->channel, $bytes);
            }
        }
    }
}