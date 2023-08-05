<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

return [
    /**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
    'repModuleTelegramProvider' => 'Провайдер Telegrame - %repesent%',
    'mo_ModuleModuleTelegramProvider' => 'Провайдер Telegram',
    'BreadcrumbModuleTelegramProvider' => 'Провайдер Telegram',
    'SubHeaderModuleTelegramProvider' => 'Подключение Telegram канала для входящих и исходящих звонков',
    'module_telegram_AddNewRecord' => 'Добавить',
    'module_telegram_provider_phone_number' => 'Номер телефона',
    'module_telegram_provider_api_id' => 'api_id',
    'module_telegram_provider_api_hash' => 'api_hash:',
    'module_telegram_providerUrlGetId' => 'этой ссылке',
    'module_telegram_providerStep2' => 'Шаг №2:',
    'module_telegram_providerStep2Title' => 'После ввода "<b>api_id</b>" и "<b>api_hash</b>" сохраните настройки и включите модуль',
    'module_telegram_providerStep1' => 'Шаг №1:',
    'module_telegram_providerStep1Part1' => 'Получите значения "<b>api_id</b>" и "<b>api_hash</b>" по',
    'module_telegram_providerStep1Part2' => 'и заполните поля ниже:',
    'module_telegram_providerStep3' => 'Шаг №3:',
    'module_telegram_providerStep3Title' => 'Добавьте в таблицу ниже номер телефона от учетной записи Telegram и выполните авторизацию. В появившемся диалоговом окне введите код авторизации.',
    'module_telegram_providerStep4' => 'Шаг №4:',
    'module_telegram_providerStep4Title' => 'Дождитесь пока модуль авторизуется в Telegram и вручную настройте провайдера, входящие и исходящие маршруты. В общих настройках включите кодек OPUS.',
    'module_telegram_providerError' => 'При попытке авторизации произошла ошибка',
    'module_telegram_providerReconnect' => 'Повторить попытку подключения...',
    'module_telegram_providerIntegerFieldLabel' => 'Пример числового поля',
    'module_telegram_providerCheckBoxFieldLabel' => 'Чекбокс',
    'module_telegram_providerToggleFieldLabel' => 'Переключатель',
    'module_telegram_providerDropDownFieldLabel' => 'Выпадающее меню',
    'module_telegram_providerValidateValueIsEmpty' => 'Проверьте поле, оно не заполнено',
    'module_telegram_providerConnected' => 'Линии подключены',
    'module_telegram_providerCopy' => 'Скопировать в буфер обмена',
    'module_telegram_providerDisconnected' => 'Модуль отключен',
    'module_telegram_providerNotAllConnected' => 'Не все линии подключены',
    'module_telegram_providerUpdateStatus' => 'Обновление статуса',
    'module_telegram_providerWaitAuth' => 'Ожидание результата авторизации...',
    'module_telegram_provider_status_gw_OK' => 'Шлюз Telegram <-> SIP: Подключен. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_gw_WAIT_START' => 'Шлюз Telegram <-> SIP: Запускается. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_gw_FAIL' => 'Шлюз Telegram <-> SIP: Не авторизован',
    'module_telegram_provider_status_user_OK' => 'Telegram клиент: Подключен. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_user_WAIT_START' => 'Telegram клиент: Запускается. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_user_FAIL' => 'Telegram клиент: Не авторизован',
    'module_telegram_provider_status_bot_OK' => 'Telegram бот: Подключен. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_bot_WAIT_START' => 'Telegram бот: Запускается. Нажмите, для повторной авторизации',
    'module_telegram_provider_status_bot_FAIL' => 'Telegram бот: Не авторизован',
    'module_telegram_provider_action_remove' => 'Удалить',
    'messengerGetPhoneCode' => 'В Telegram был выслан секретный код. Введите код авторизации:',
    'messengerGetBotToken' => 'Введите token от своего Telegram бота:',
    'Confirm this login link on another device:' => 'Подтведите вход на другом устройстве, с запущенным Telegram:',
    'Enter authentication password:' => 'Введите пароль аккаунта Telegram:',
    'Enter your first name:' => 'Введите свое имя для регистрации в Telegram:',
    'Enter your last name:' => 'Введите свою фамилию для регистрации в Telegram:',
    'Enter phone number:' => 'Введите номер телефона для регистрации в Telegram:',
    'Enter the employee internal number' => 'Введите внутренний номер абонента',
    'Internal number entry form' => 'Форма ввода добавочного номера',
    'Ordering a callback' => 'Заказ обратного звонка',
    'MessageNoAnswer' => 'К сожалению мы до Вас не дозвонились. Заказать обратный звонок можно по кнопке ниже',
    'request a call back' => 'Перезвонить',
    'Identifiers' => 'Идентификаторы',
    'MessageTemplates' => 'Шаблоны сообщений',
    'CallbackText' => 'Обратный звонок',
    'businessCardText' => 'Текст визитки',
    'businessCardSubText' => 'Будет отправлен сообщением в Telegram клиента, если он не ответил на звонок.',
    'keyboardText' => 'Текст клавиатуры ввода внутреннего номера',
    'keyboardSubText' => 'Будет отправлен вместе с клавиатурой в Telegram клиента при входящем звонке.',
    'callbackQueueText' => 'Очередь для обработки звонков',
    'callbackQueueSubText' => '<br> Функция предназначена для случаев, когда клиент не ответил навызов.<br>Если вызов пропущен клиентом, то ему будет оправлена визитка. <br> Вместе с визиткой отправляется кнопка "Перезвонить".<br> При нажатии на кнопку вызов, будет направлен на очередь.<br> Как только сотрудник поднимет трубку, вызов будет направлен клиенту.<br>',
];
