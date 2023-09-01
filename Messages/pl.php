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
    'module_telegram_providerUrlGetId' => 'ten link',
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
    'module_telegram_providerWaitAuth' => 'Oczekiwanie na wynik autoryzacji...',
    'module_telegram_provider_status_gw_OK' => 'Brama telegramu <-> SIP: Połączono. Kliknij, aby ponownie autoryzować',
    'module_telegram_provider_status_gw_WAIT_START' => 'Brama Telegramu <-> SIP: Uruchamianie. Kliknij, aby ponownie autoryzować',
    'module_telegram_provider_status_gw_FAIL' => 'Brama telegramu <-> SIP: Brak autoryzacji',
    'module_telegram_provider_action_remove' => 'Usuwać',
    'module_telegram_providerStep2' => 'Krok 2:',
    'module_telegram_providerStep2Title' => 'Po wpisaniu „<b>api_id</b>” i „<b>api_hash</b>” zapisz ustawienia i włącz moduł',
    'module_telegram_providerStep1' => 'Krok 1:',
    'module_telegram_providerStep3Title' => 'Dodaj numer telefonu ze swojego konta Telegram do poniższej tabeli i autoryzuj. W wyświetlonym oknie dialogowym wprowadź kod autoryzacyjny.',
    'module_telegram_providerStep4' => 'Krok 4:',
    'Internal number entry form' => 'Formularz wprowadzania numeru wewnętrznego',
    'Ordering a callback' => 'Zamówienie zwrotne',
    'request a call back' => 'oddzwonić',
    'Identifiers' => 'Identyfikatory',
    'MessageTemplates' => 'Szablony wiadomości',
    'CallbackText' => 'Oddzwanianie',
    'businessCardText' => 'Tekst wizytówki',
    'businessCardSubText' => 'Zostanie wysłana jako wiadomość na Telegram klienta, jeśli nie odebrał połączenia.',
    'MessageNoAnswer' => 'Niestety nie udało nam się do Ciebie dotrzeć. Możesz poprosić o oddzwonienie, klikając przycisk poniżej.',
    'Enter the employee internal number' => 'Wprowadź numer wewnętrzny abonenta',
    'autoAnswerText' => 'Automatyczna sekretarka',
    'module_telegram_provider_bot_token' => 'Token bota',
    'callbackQueueText' => 'Kolejka przetwarzania połączeń',
    'module_telegram_provider_gw' => 'Telegram <-> Bramka SIP',
    'module_telegram_provider_user' => 'Klient telegramu',
    'module_telegram_provider_status_user_WAIT_START' => 'Klient telegramu: Uruchamianie. Kliknij, aby ponownie autoryzować',
    'module_telegram_provider_status_user_FAIL' => 'Klient telegramu: Nieautoryzowany',
    'module_telegram_provider_status_bot_FAIL' => 'Bot telegramowy: Nieautoryzowany',
    'module_telegram_providerStep1Part1' => 'Uzyskaj wartości „<b>api_id</b>” i „<b>api_hash</b>” przez',
    'module_telegram_providerStep1Part2' => 'i wypełnij poniższe pola:',
    'module_telegram_providerStep3' => 'Krok 3:',
    'module_telegram_providerStep4Title' => 'Poczekaj, aż moduł zostanie autoryzowany w Telegramie i ręcznie skonfiguruj dostawcę oraz trasy przychodzące i wychodzące. W ustawieniach ogólnych włącz kodek OPUS.',
    'messengerGetPhoneCode' => 'Do Telegramu wysłano tajny kod. Wprowadź kod autoryzacji:',
    'messengerGetBotToken' => 'Wprowadź token z bota Telegramu:',
    'Confirm this login link on another device:' => 'Potwierdź logowanie na innym urządzeniu z uruchomionym Telegramem:',
    'Enter authentication password:' => 'Wprowadź hasło do konta Telegram:',
    'Enter your first name:' => 'Wpisz swoje imię i nazwisko, aby zarejestrować się w Telegramie:',
    'Enter your last name:' => 'Wpisz swoje nazwisko, aby zarejestrować się w Telegramie:',
    'Enter phone number:' => 'Wpisz swój numer telefonu, aby zarejestrować się w Telegramie:',
    'keyboardText' => 'Tekst na klawiaturze numeru wewnętrznego',
    'keyboardSubText' => 'Zostanie on przesłany wraz z klawiaturą do Telegramu Klienta podczas połączenia przychodzącego.',
    'autoAnswerTextSubText' => 'Jeśli Klient napisze wiadomość przychodzącą, zostanie wysłana wiadomość SMS',
    'module_telegram_provider_status_user_OK' => 'Klient telegramu: Połączono. Kliknij, aby ponownie autoryzować',
    'module_telegram_provider_status_bot_OK' => 'Bot telegramu: Połączono. Kliknij, aby ponownie autoryzować',
    'module_telegram_provider_status_bot_WAIT_START' => 'Bot telegramu: Uruchamiam. Kliknij, aby ponownie autoryzować',
    'callbackQueueSubText' => '<br> Funkcja przeznaczona jest dla przypadków, gdy klient nie odebrał połączenia.<br>W przypadku nieodebrania połączenia przez klienta, zostanie do niego wysłana wizytówka. <br> Razem z wizytówką wysyłany jest przycisk „Oddzwoń”.<br> Po kliknięciu w przycisk połączenie zostanie przekierowane do kolejki.<br> Gdy tylko pracownik odbierze telefon, połączenie zostanie wysłane do klienta.<br>',
];
