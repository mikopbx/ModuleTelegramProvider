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
    'module_telegram_provider_api_id' => 'App api_id',
    'module_telegram_provider_api_hash' => 'App api_hash:',
    'module_telegram_providerUrlGetId' => 'Obter "App api_id" e "App api_hash"...',
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
    'module_telegram_providerWaitAuth' => 'Aguardando resultado da autorização...',
    'module_telegram_provider_status_gw_OK' => 'Telegram Gateway <-> SIP: Conectado. Clique para reconectar',
    'module_telegram_provider_status_gw_WAIT_START' => 'Telegram Gateway <-> SIP: Iniciando. Clique para reconetar',
    'module_telegram_provider_action_remove' => 'Excluir',
    'module_telegram_providerStep2' => 'Passo 2º:',
    'module_telegram_providerStep2Title' => 'Depois de inserir "<b>api_id</b>" e "<b>api_hash</b>" salve as configurações e habilite o módulo',
    'module_telegram_providerStep1' => 'Passo 1º:',
    'module_telegram_providerStep1Part1' => 'Obtenha os valores "<b>api_id</b>" e "<b>api_hash</b>" por',
    'module_telegram_providerStep1Part2' => 'e preencha os campos abaixo:',
    'module_telegram_provider_status_user_OK' => 'Cliente Telegram: Conectado. Clique para reconectar',
    'module_telegram_provider_status_user_FAIL' => 'Cliente Telegram: Não autorizado',
    'module_telegram_providerStep3' => 'Passo 3º:',
    'module_telegram_providerStep3Title' => 'Adicione o número de telefone da sua conta do Telegram na tabela abaixo e autorize. Na caixa de diálogo que aparece, insira o código de autorização.',
    'module_telegram_providerStep4' => 'Passo 4º:',
    'module_telegram_providerStep4Title' => 'Aguarde até que o módulo seja autorizado no Telegram e configure manualmente o provedor, as rotas de entrada e saída. Nas configurações gerais, habilite o codec OPUS.',
    'module_telegram_provider_status_gw_FAIL' => 'Telegram <-> gateway SIP: não autorizado',
    'messengerGetPhoneCode' => 'Um código secreto foi enviado ao Telegram. Insira o código de autorização:',
    'messengerGetBotToken' => 'Digite o token do seu bot do Telegram:',
    'Confirm this login link on another device:' => 'Confirme o login em outro dispositivo rodando o Telegram:',
    'Enter authentication password:' => 'Digite a senha da sua conta do Telegram:',
    'Enter your first name:' => 'Digite seu nome para se registrar no Telegram:',
    'Ordering a callback' => 'Pedido de retorno de chamada',
    'request a call back' => 'ligar de volta',
    'Identifiers' => 'identificador',
    'MessageTemplates' => 'Modelos de mensagem',
    'Enter the employee internal number' => 'Digite o número do ramal do assinante',
    'Internal number entry form' => 'Formulário de entrada do número de ramal',
    'CallbackText' => 'Chamada de retorno',
    'businessCardText' => 'Texto do cartão de visita',
    'keyboardText' => 'Texto do teclado de extensão',
    'keyboardSubText' => 'Será enviado junto com o teclado para o Telegram do cliente para uma chamada recebida.',
    'callbackQueueText' => 'Fila de processamento de chamadas',
    'businessCardSubText' => 'Será enviado como mensagem para o Telegram do cliente caso ele não tenha atendido a ligação.',
    'MessageNoAnswer' => 'Infelizmente não conseguimos falar com você. Você pode solicitar um retorno de chamada clicando no botão abaixo',
    'callbackQueueSubText' => '<br> A função é destinada aos casos em que o cliente não atendeu a chamada.<br>Se a chamada for perdida pelo cliente, um cartão de visita será enviado a ele. <br> Junto com o cartão de visita, é enviado o botão "Retornar".<br> Ao pressionar o botão, a chamada será direcionada para a fila.<br> Assim que o funcionário atender o telefone, chamada será enviada ao cliente.<br>',
    'autoAnswerText' => 'Secretária eletrônica',
    'module_telegram_provider_gw' => 'Gateway Telegrama <-> SIP',
    'module_telegram_provider_status_user_WAIT_START' => 'Cliente Telegram: Lançamento. Clique para reconectar',
    'module_telegram_provider_user' => 'Cliente Telegram',
    'module_telegram_provider_status_bot_OK' => 'Bot do Telegram: Conectado. Clique para reconectar',
    'module_telegram_provider_status_bot_WAIT_START' => 'Bot do Telegram: Lançamento. Clique para reconectar',
    'module_telegram_provider_status_bot_FAIL' => 'Bot do Telegram: Não autorizado',
    'Enter your last name:' => 'Digite seu sobrenome para se registrar no Telegram:',
    'Enter phone number:' => 'Digite seu número de telefone para se registrar no Telegram:',
    'module_telegram_provider_bot_token' => 'Token de Bot',
    'autoAnswerTextSubText' => 'Uma mensagem de texto será enviada se o cliente escrever uma mensagem recebida',
];
