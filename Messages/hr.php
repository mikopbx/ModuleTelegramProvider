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
    'repModuleTelegramProvider' => 'Davatelj telegrama - %repesent%',
    'mo_ModuleModuleTelegramProvider' => 'Telegram pružatelj usluga',
    'BreadcrumbModuleTelegramProvider' => 'Telegram pružatelj usluga',
    'SubHeaderModuleTelegramProvider' => 'Spajanje Telegram kanala za dolazne i odlazne pozive',
    'module_telegram_AddNewRecord' => 'Dodati',
    'module_telegram_provider_phone_number' => 'Broj telefona',
    'module_telegram_provider_api_id' => 'api_id',
    'module_telegram_provider_api_hash' => 'api_hash:',
    'module_telegram_providerUrlGetId' => 'ovaj link',
    'module_telegram_providerStep2' => 'Korak #2:',
    'module_telegram_providerStep2Title' => 'Nakon unosa "<b>api_id</b>" i "<b>api_hash</b>" spremite postavke i omogućite modul',
    'module_telegram_providerStep1' => '1. korak:',
    'module_telegram_providerStep1Part1' => 'Dobijte vrijednosti "<b>api_id</b>" i "<b>api_hash</b>" tako što',
    'module_telegram_providerStep1Part2' => 'i ispunite polja u nastavku:',
    'module_telegram_providerStep3' => 'Korak #3:',
    'module_telegram_providerStep3Title' => 'Dodajte telefonski broj sa svog Telegram računa u tablicu ispod i prijavite se. U dijaloški okvir koji se pojavi unesite autorizacijski kod.',
    'module_telegram_providerStep4' => 'Korak #4:',
    'module_telegram_providerStep4Title' => 'Pričekajte da se modul autorizira u Telegramu i ručno konfigurirajte davatelja, dolazne i odlazne rute. U općim postavkama omogućite kodek OPUS.',
    'module_telegram_providerError' => 'Došlo je do pogreške prilikom pokušaja prijave',
    'module_telegram_providerReconnect' => 'Pokušajte se ponovo povezati...',
    'module_telegram_providerIntegerFieldLabel' => 'Primjer numeričkog polja',
    'module_telegram_providerCheckBoxFieldLabel' => 'Potvrdni okvir',
    'module_telegram_providerToggleFieldLabel' => 'Prekidač',
    'module_telegram_providerDropDownFieldLabel' => 'Padajući izbornik',
    'module_telegram_providerValidateValueIsEmpty' => 'Provjerite polje, prazno je',
    'module_telegram_providerConnected' => 'Linije su povezane',
    'module_telegram_providerCopy' => 'Kopiraj u međuspremnik',
    'module_telegram_providerDisconnected' => 'Modul onemogućen',
    'module_telegram_providerNotAllConnected' => 'Nisu sve linije povezane',
    'module_telegram_providerUpdateStatus' => 'Ažuriranje statusa',
    'module_telegram_providerWaitAuth' => 'Čeka se rezultat autorizacije...',
    'module_telegram_provider_gw' => 'Telegram <-> SIP pristupnik',
    'module_telegram_provider_user' => 'Telegram klijent',
    'module_telegram_provider_status_gw_OK' => 'Telegram <-> SIP pristupnik: Povezano. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_gw_WAIT_START' => 'Telegram <-> SIP pristupnik: Počinje. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_gw_FAIL' => 'Telegram <-> SIP pristupnik: Nije autoriziran',
    'module_telegram_provider_status_user_OK' => 'Telegram klijent: Povezan. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_user_WAIT_START' => 'Telegram klijent: Počinje. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_user_FAIL' => 'Klijent Telegrama: Nije autoriziran',
    'module_telegram_provider_status_bot_OK' => 'Telegram bot: Povezano. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_bot_WAIT_START' => 'Telegram bot: Pokretanje. Kliknite za ponovnu autorizaciju',
    'module_telegram_provider_status_bot_FAIL' => 'Telegram bot: Nije ovlašten',
    'module_telegram_provider_action_remove' => 'Izbrisati',
    'messengerGetPhoneCode' => 'Telegramu je poslan tajni kod. Unesite autorizacijski kod:',
    'messengerGetBotToken' => 'Unesite token sa svog Telegram bota:',
    'Confirm this login link on another device:' => 'Potvrdite svoju prijavu na drugom uređaju na kojem je pokrenut Telegram:',
    'Enter authentication password:' => 'Unesite lozinku za Telegram račun:',
    'Enter your first name:' => 'Unesite svoje ime za registraciju u Telegramu:',
    'Enter your last name:' => 'Unesite svoje prezime za registraciju u Telegramu:',
    'Enter phone number:' => 'Unesite svoj broj telefona za registraciju u Telegramu:',
    'Enter the employee internal number' => 'Unesite dodatni broj pretplatnika',
    'Internal number entry form' => 'Obrazac za unos kućnog broja',
    'Ordering a callback' => 'Naručite povratni poziv',
    'MessageNoAnswer' => 'Nažalost, nismo vas dobili telefonom. Možete zatražiti povratni poziv pomoću gumba ispod',
    'request a call back' => 'Povratni poziv',
    'Identifiers' => 'Identifikatori',
    'module_telegram_provider_bot_token' => 'Bot Token',
    'MessageTemplates' => 'Predlošci poruka',
    'CallbackText' => 'Povratni poziv',
    'businessCardText' => 'Tekst posjetnice',
    'businessCardSubText' => 'Bit će poslana kao poruka u Telegram klijenta ako nije odgovorio na poziv.',
    'keyboardText' => 'Tekst tipkovnice za unos kućnog broja',
    'keyboardSubText' => 'Poslat će se zajedno s tipkovnicom u Telegram klijenta kada postoji dolazni poziv.',
    'autoAnswerText' => 'Automatski odgovor',
    'autoAnswerTextSubText' => 'Tekstualna poruka bit će poslana ako klijent napiše dolaznu poruku',
    'callbackQueueText' => 'Red za obradu poziva',
    'callbackQueueSubText' => '<br> Funkcija je namijenjena slučajevima kada klijent nije odgovorio na poziv.<br>Ako klijent propusti poziv, poslat će mu se posjetnica. <br> Gumb "Povratni poziv" šalje se zajedno s posjetnicom.<br> Kada pritisnete gumb, poziv će biti usmjeren u red čekanja.<br> Čim zaposlenik podigne slušalicu, poziv bit će usmjeren na klijenta.<br>',
];
