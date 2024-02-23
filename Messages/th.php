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
    'repModuleTelegramProvider' => 'ผู้ให้บริการโทรเลข - % ซ้ำ%',
    'mo_ModuleModuleTelegramProvider' => 'ผู้ให้บริการโทรเลข',
    'BreadcrumbModuleTelegramProvider' => 'ผู้ให้บริการโทรเลข',
    'SubHeaderModuleTelegramProvider' => 'การเชื่อมต่อช่องโทรเลขสำหรับการโทรเข้าและโทรออก',
    'module_telegram_AddNewRecord' => 'เพิ่ม',
    'module_telegram_provider_phone_number' => 'หมายเลขโทรศัพท์',
    'module_telegram_provider_api_id' => 'api_id',
    'module_telegram_provider_api_hash' => 'api_hash:',
    'module_telegram_providerUrlGetId' => 'ลิงค์นี้',
    'module_telegram_providerStep2' => 'ขั้นตอนที่ 2:',
    'module_telegram_providerStep2Title' => 'หลังจากป้อน "<b>api_id</b>" และ "<b>api_hash</b>" ให้บันทึกการตั้งค่าและเปิดใช้งานโมดูล',
    'module_telegram_providerStep1' => 'ขั้นตอนที่ 1:',
    'module_telegram_providerStep1Part1' => 'รับค่า "<b>api_id</b>" และ "<b>api_hash</b>" โดย',
    'module_telegram_providerStep1Part2' => 'และกรอกข้อมูลในช่องด้านล่าง:',
    'module_telegram_providerStep3' => 'ขั้นตอนที่ #3:',
    'module_telegram_providerStep3Title' => 'เพิ่มหมายเลขโทรศัพท์จากบัญชี Telegram ของคุณลงในตารางด้านล่างและเข้าสู่ระบบ ในกล่องโต้ตอบที่ปรากฏขึ้น ให้ป้อนรหัสการให้สิทธิ์',
    'module_telegram_providerStep4' => 'ขั้นตอนที่ #4:',
    'module_telegram_providerStep4Title' => 'รอจนกว่าโมดูลจะได้รับอนุญาตใน Telegram และกำหนดค่าผู้ให้บริการ เส้นทางขาเข้าและขาออกด้วยตนเอง ในการตั้งค่าทั่วไป ให้เปิดใช้งานตัวแปลงสัญญาณ OPUS',
    'module_telegram_providerError' => 'เกิดข้อผิดพลาดขณะพยายามเข้าสู่ระบบ',
    'module_telegram_providerReconnect' => 'ลองเชื่อมต่ออีกครั้ง...',
    'module_telegram_providerIntegerFieldLabel' => 'ตัวอย่างช่องตัวเลข',
    'module_telegram_providerCheckBoxFieldLabel' => 'ช่องทำเครื่องหมาย',
    'module_telegram_providerToggleFieldLabel' => 'สวิตช์',
    'module_telegram_providerDropDownFieldLabel' => 'เมนูแบบเลื่อนลง',
    'module_telegram_providerValidateValueIsEmpty' => 'ตรวจสอบสนามว่าว่างเปล่า',
    'module_telegram_providerConnected' => 'มีการเชื่อมต่อสาย',
    'module_telegram_providerCopy' => 'คัดลอกไปยังคลิปบอร์ด',
    'module_telegram_providerDisconnected' => 'ปิดใช้งานโมดูลแล้ว',
    'module_telegram_providerNotAllConnected' => 'ไม่ได้เชื่อมต่อทุกสาย',
    'module_telegram_providerUpdateStatus' => 'อัพเดทสถานะ',
    'module_telegram_providerWaitAuth' => 'กำลังรอผลการอนุญาต...',
    'module_telegram_provider_gw' => 'โทรเลข <-> เกตเวย์ SIP',
    'module_telegram_provider_user' => 'ลูกค้าโทรเลข',
    'module_telegram_provider_status_gw_OK' => 'โทรเลข <-> เกตเวย์ SIP: เชื่อมต่อแล้ว คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_gw_WAIT_START' => 'โทรเลข <-> เกตเวย์ SIP: กำลังเริ่มต้น คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_gw_FAIL' => 'โทรเลข <-> เกตเวย์ SIP: ไม่ได้รับอนุญาต',
    'module_telegram_provider_status_user_OK' => 'ลูกค้าโทรเลข: เชื่อมต่อแล้ว คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_user_WAIT_START' => 'ลูกค้าโทรเลข: กำลังเริ่มต้น คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_user_FAIL' => 'ลูกค้าโทรเลข: ไม่ได้รับอนุญาต',
    'module_telegram_provider_status_bot_OK' => 'บอทโทรเลข: เชื่อมต่อแล้ว คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_bot_WAIT_START' => 'บอทโทรเลข: กำลังเปิดตัว คลิกเพื่ออนุญาตอีกครั้ง',
    'module_telegram_provider_status_bot_FAIL' => 'บอทโทรเลข: ไม่ได้รับอนุญาต',
    'module_telegram_provider_action_remove' => 'ลบ',
    'messengerGetPhoneCode' => 'รหัสลับถูกส่งไปยัง Telegram ใส่รหัสอนุมัติ:',
    'messengerGetBotToken' => 'ป้อนโทเค็นจากบอท Telegram ของคุณ:',
    'Confirm this login link on another device:' => 'ยืนยันการเข้าสู่ระบบของคุณบนอุปกรณ์อื่นที่ใช้ Telegram:',
    'Enter authentication password:' => 'ป้อนรหัสผ่านบัญชีโทรเลขของคุณ:',
    'Enter your first name:' => 'ป้อนชื่อของคุณเพื่อลงทะเบียนใน Telegram:',
    'Enter your last name:' => 'ป้อนนามสกุลของคุณเพื่อลงทะเบียนใน Telegram:',
    'Enter phone number:' => 'ป้อนหมายเลขโทรศัพท์ของคุณเพื่อลงทะเบียนใน Telegram:',
    'Enter the employee internal number' => 'ป้อนหมายเลขต่อของผู้สมัครสมาชิก',
    'Internal number entry form' => 'แบบฟอร์มการป้อนหมายเลขส่วนขยาย',
    'Ordering a callback' => 'สั่งโทรกลับ',
    'MessageNoAnswer' => 'ขออภัย เราไม่สามารถติดต่อคุณทางโทรศัพท์ได้ คุณสามารถขอให้โทรกลับได้โดยใช้ปุ่มด้านล่าง',
    'request a call back' => 'โทรกลับ',
    'Identifiers' => 'ตัวระบุ',
    'module_telegram_provider_bot_token' => 'โทเค็นบอท',
    'MessageTemplates' => 'แม่แบบข้อความ',
    'CallbackText' => 'โทรกลับ',
    'businessCardText' => 'ข้อความนามบัตร',
    'businessCardSubText' => 'จะถูกส่งเป็นข้อความไปยัง Telegram ของลูกค้าหากเขาไม่รับสาย',
    'keyboardText' => 'ข้อความปุ่มกดป้อนหมายเลขต่อ',
    'keyboardSubText' => 'มันจะถูกส่งไปพร้อมกับคีย์บอร์ดไปยังโทรเลขของลูกค้าเมื่อมีสายเรียกเข้า',
    'autoAnswerText' => 'ระบบตอบรับอัตโนมัติ',
    'autoAnswerTextSubText' => 'ข้อความจะถูกส่งหากลูกค้าเขียนข้อความขาเข้า',
    'callbackQueueText' => 'คิวสำหรับการประมวลผลการโทร',
    'callbackQueueSubText' => '<br> ฟังก์ชั่นนี้มีไว้สำหรับกรณีที่ลูกค้าไม่รับสาย<br>หากลูกค้าไม่ได้รับสาย นามบัตรจะถูกส่งไปยังเขา <br> ปุ่ม “โทรกลับ” จะถูกส่งไปพร้อมกับนามบัตร<br> เมื่อคุณกดปุ่ม สายโทรเข้าจะถูกส่งไปยังคิว<br> ทันทีที่พนักงานรับสาย สายโทรเข้าจะโทรออก จะถูกส่งไปยังลูกค้าโดยตรง<br>',
];
