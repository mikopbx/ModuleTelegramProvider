<?php
return [
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
    /**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
    'repModuleTelegramProvider' => 'Távirat szolgáltató - %repesent%',
    'mo_ModuleModuleTelegramProvider' => 'Távirat szolgáltató',
    'BreadcrumbModuleTelegramProvider' => 'Távirat szolgáltató',
    'SubHeaderModuleTelegramProvider' => 'Telegram csatorna csatlakoztatása bejövő és kimenő hívásokhoz',
    'module_telegram_AddNewRecord' => 'Hozzáadás',
    'module_telegram_provider_phone_number' => 'Telefonszám',
    'module_telegram_provider_api_id' => 'api_id',
    'module_telegram_provider_api_hash' => 'api_hash:',
    'module_telegram_providerUrlGetId' => 'ez a link',
    'module_telegram_providerStep2' => '2. lépés:',
    'module_telegram_providerStep2Title' => 'Az „<b>api_id</b>” és „<b>api_hash</b>” beírása után mentse el a beállításokat, és engedélyezze a modult',
    'module_telegram_providerStep1' => '1. lépés:',
    'module_telegram_providerStep1Part1' => 'Szerezze be az „<b>api_id</b>” és „<b>api_hash</b>” értékeket',
    'module_telegram_providerStep1Part2' => 'és töltse ki az alábbi mezőket:',
    'module_telegram_providerStep3' => '3. lépés:',
    'module_telegram_providerStep3Title' => 'Adja hozzá a Telegram-fiókjából származó telefonszámot az alábbi táblázathoz, és jelentkezzen be. A megjelenő párbeszédpanelen írja be az engedélyezési kódot.',
    'module_telegram_providerStep4' => '4. lépés:',
    'module_telegram_providerStep4Title' => 'Várja meg, amíg a modul engedélyezve van a Telegramban, és manuálisan konfigurálja a szolgáltatót, a bejövő és kimenő útvonalakat. Az általános beállításoknál engedélyezze az OPUS kodeket.',
    'module_telegram_providerError' => 'Hiba történt a bejelentkezési kísérlet során',
    'module_telegram_providerReconnect' => 'Próbáljon újra csatlakozni...',
    'module_telegram_providerIntegerFieldLabel' => 'Példa numerikus mezőre',
    'module_telegram_providerCheckBoxFieldLabel' => 'Jelölőnégyzet',
    'module_telegram_providerToggleFieldLabel' => 'Kapcsoló',
    'module_telegram_providerDropDownFieldLabel' => 'Legördülő menü',
    'module_telegram_providerValidateValueIsEmpty' => 'Ellenőrizze a mezőt, üres',
    'module_telegram_providerConnected' => 'A vonalak össze vannak kötve',
    'module_telegram_providerCopy' => 'Másolja a vágólapra',
    'module_telegram_providerDisconnected' => 'Modul letiltva',
    'module_telegram_providerNotAllConnected' => 'Nincs minden vonal csatlakoztatva',
    'module_telegram_providerUpdateStatus' => 'Állapotfrissítés',
    'module_telegram_providerWaitAuth' => 'Várakozás az engedélyezési eredményre...',
    'module_telegram_provider_gw' => 'Telegram <-> SIP átjáró',
    'module_telegram_provider_user' => 'Telegram kliens',
    'module_telegram_provider_status_gw_OK' => 'Telegram <-> SIP átjáró: Csatlakozva. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_gw_WAIT_START' => 'Telegram <-> SIP átjáró: Indítás. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_gw_FAIL' => 'Telegram <-> SIP átjáró: Nem engedélyezett',
    'module_telegram_provider_status_user_OK' => 'Telegram kliens: Csatlakozva. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_user_WAIT_START' => 'Telegram kliens: Indítás. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_user_FAIL' => 'Telegram kliens: Nem engedélyezett',
    'module_telegram_provider_status_bot_OK' => 'Telegram bot: csatlakoztatva. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_bot_WAIT_START' => 'Telegram bot: Indítás. Kattintson az újbóli engedélyezéshez',
    'module_telegram_provider_status_bot_FAIL' => 'Telegram bot: Nem engedélyezett',
    'module_telegram_provider_action_remove' => 'Töröl',
    'messengerGetPhoneCode' => 'A Telegramnak titkos kódot küldtek. Írja be az engedélyezési kódot:',
    'messengerGetBotToken' => 'Írja be a tokent a Telegram botjából:',
    'Confirm this login link on another device:' => 'Erősítse meg bejelentkezését egy másik Telegramot futtató eszközön:',
    'Enter authentication password:' => 'Írja be a Telegram fiók jelszavát:',
    'Enter your first name:' => 'Adja meg nevét a Telegram regisztrációhoz:',
    'Enter your last name:' => 'Adja meg vezetéknevét a Telegram regisztrációhoz:',
    'Enter phone number:' => 'Adja meg telefonszámát a Telegram regisztrációhoz:',
    'Enter the employee internal number' => 'Adja meg az előfizető mellékének számát',
    'Internal number entry form' => 'Mellékszám beviteli űrlap',
    'Ordering a callback' => 'Rendeljen visszahívást',
    'MessageNoAnswer' => 'Sajnos nem sikerült elérni telefonon. Visszahívást kérhet az alábbi gombbal',
    'request a call back' => 'Visszahív',
    'Identifiers' => 'Azonosítók',
    'module_telegram_provider_bot_token' => 'Bot Token',
    'MessageTemplates' => 'Üzenet sablonok',
    'CallbackText' => 'Visszahívás',
    'businessCardText' => 'Névjegykártya szöveg',
    'businessCardSubText' => 'Ha nem veszi fel a hívást, a rendszer üzenetként küldi el az ügyfél Telegramjának.',
    'keyboardText' => 'Mellékállomás számának bevitele a billentyűzeten',
    'keyboardSubText' => 'Bejövő hívás esetén a billentyűzettel együtt elküldik az ügyfél táviratába.',
    'autoAnswerText' => 'Automatikus válasz',
    'autoAnswerTextSubText' => 'A rendszer szöveges üzenetet küld, ha az ügyfél bejövő üzenetet ír',
    'callbackQueueText' => 'Sor a hívásfeldolgozáshoz',
    'callbackQueueSubText' => '<br> A funkció azokra az esetekre szolgál, amikor az ügyfél nem vette fel a hívást.<br>Ha az ügyfél nem fogadja a hívást, névjegykártyát küld neki. <br> A névjegykártyával együtt elküldésre kerül a „Visszahívás” gomb.<br> A gomb megnyomásakor a hívás a sorba kerül.<br> Amint az alkalmazott felveszi a telefont, a hívás az ügyfélhez lesz irányítva.<br>',
];
