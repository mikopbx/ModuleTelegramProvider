<?php
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
    'module_telegram_providerUrlGetId' => 'ეს ბმული',
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
    'module_telegram_providerWaitAuth' => 'ავტორიზაციის შედეგს ელოდება...',
    'module_telegram_provider_status_gw_FAIL' => 'Telegram Gateway <-> SIP: არ არის ავტორიზებული',
    'module_telegram_provider_status_gw_OK' => 'Telegram Gateway <-> SIP: დაკავშირებულია. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'module_telegram_provider_status_gw_WAIT_START' => 'Telegram Gateway <-> SIP: იწყება. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'module_telegram_provider_action_remove' => 'წაშლა',
    'module_telegram_providerStep2Title' => '„<b>api_id</b>“ და „<b>api_hash</b>“ შეყვანის შემდეგ შეინახეთ პარამეტრები და ჩართეთ მოდული',
    'module_telegram_providerStep1' => 'Ნაბიჯი 1:',
    'module_telegram_provider_status_user_OK' => 'Telegram კლიენტი: დაკავშირებულია. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'module_telegram_provider_status_user_WAIT_START' => 'Telegram კლიენტი: გაშვება. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'module_telegram_provider_status_bot_FAIL' => 'Telegram bot: არ არის ავტორიზებული',
    'messengerGetPhoneCode' => 'საიდუმლო კოდი გაიგზავნა Telegram-ზე. შეიყვანეთ ავტორიზაციის კოდი:',
    'messengerGetBotToken' => 'შეიყვანეთ ჟეტონი თქვენი Telegram ბოტიდან:',
    'Confirm this login link on another device:' => 'დაადასტურეთ შესვლა სხვა მოწყობილობაზე, რომელიც მუშაობს Telegram-ზე:',
    'Enter authentication password:' => 'შეიყვანეთ თქვენი Telegram ანგარიშის პაროლი:',
    'Internal number entry form' => 'გაფართოების ნომრის შესვლის ფორმა',
    'Ordering a callback' => 'დარეკვის შეკვეთა',
    'request a call back' => 'გადმომირეკე',
    'Identifiers' => 'იდენტიფიკატორები',
    'MessageTemplates' => 'შეტყობინებების შაბლონები',
    'CallbackText' => 'უკან ზარი',
    'businessCardText' => 'სავიზიტო ბარათის ტექსტი',
    'businessCardSubText' => 'გაიგზავნება მესიჯის სახით კლიენტის Telegram-ზე, თუ ის არ უპასუხა ზარს.',
    'keyboardText' => 'გაფართოების ნომრის კლავიატურის ტექსტი',
    'keyboardSubText' => 'ის კლავიატურასთან ერთად გაიგზავნება კლიენტის Telegram-ზე შემომავალი ზარის დროს.',
    'MessageNoAnswer' => 'სამწუხაროდ, ჩვენ ვერ შეგხვდათ. შეგიძლიათ მოითხოვოთ დარეკვა ქვემოთ მოცემულ ღილაკზე დაწკაპუნებით.',
    'Enter the employee internal number' => 'შეიყვანეთ აბონენტის გაფართოების ნომერი',
    'autoAnswerText' => 'Მოპასუხე მანქანა',
    'autoAnswerTextSubText' => 'თუ კლიენტი შემომავალ შეტყობინებას დაწერს, გაიგზავნება ტექსტური შეტყობინება',
    'callbackQueueSubText' => '<br> ფუნქცია განკუთვნილია იმ შემთხვევისთვის, როდესაც კლიენტმა არ უპასუხა ზარს.<br>თუ ზარი გამოტოვებულია კლიენტის მიერ, მაშინ მას ეგზავნება სავიზიტო ბარათი. <br> სავიზიტო ბარათთან ერთად იგზავნება ღილაკი "დარეკვა".<br> ღილაკზე დაწკაპუნებისას ზარი მიემართება რიგში.<br> როგორც კი თანამშრომელი აიღებს ტელეფონს, ზარი გაეგზავნება კლიენტს.<br>',
    'module_telegram_provider_bot_token' => 'ბოტის ჟეტონი',
    'callbackQueueText' => 'ზარის დამუშავების რიგი',
    'module_telegram_provider_gw' => 'Telegram <-> SIP Gateway',
    'module_telegram_provider_user' => 'Telegram კლიენტი',
    'module_telegram_providerStep2' => 'ნაბიჯი #2:',
    'module_telegram_providerStep1Part1' => 'მიიღეთ მნიშვნელობები "<b>api_id</b>" და "<b>api_hash</b>" მიერ',
    'module_telegram_providerStep1Part2' => 'და შეავსეთ ქვემოთ მოცემული ველები:',
    'module_telegram_providerStep3' => 'ნაბიჯი #3:',
    'module_telegram_providerStep3Title' => 'დაამატეთ ტელეფონის ნომერი თქვენი Telegram ანგარიშიდან ქვემოთ მოცემულ ცხრილში და ავტორიზაცია. დიალოგურ ფანჯარაში, რომელიც გამოჩნდება, შეიყვანეთ ავტორიზაციის კოდი.',
    'module_telegram_providerStep4' => 'ნაბიჯი #4:',
    'module_telegram_providerStep4Title' => 'დაელოდეთ მოდულის ავტორიზაციას Telegram-ში და ხელით დააკონფიგურირეთ პროვაიდერი, შემომავალი და გამავალი მარშრუტები. ზოგად პარამეტრებში ჩართეთ OPUS კოდეკი.',
    'module_telegram_provider_status_user_FAIL' => 'Telegram-ის კლიენტი: არ არის ავტორიზებული',
    'module_telegram_provider_status_bot_OK' => 'Telegram bot: დაკავშირებულია. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'module_telegram_provider_status_bot_WAIT_START' => 'Telegram bot: გაშვება. დააწკაპუნეთ ხელახლა ავტორიზაციისთვის',
    'Enter your first name:' => 'შეიყვანეთ თქვენი სახელი Telegram-ში რეგისტრაციისთვის:',
    'Enter your last name:' => 'Telegram-ში რეგისტრაციისთვის შეიყვანეთ თქვენი გვარი:',
    'Enter phone number:' => 'Telegram-ში რეგისტრაციისთვის შეიყვანეთ თქვენი ტელეფონის ნომერი:',
];
