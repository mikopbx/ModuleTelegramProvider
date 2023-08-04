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

"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */
var idUrl = 'module-telegram-provider';
var idForm = 'module-telegram-provider-form';
var className = 'ModuleTelegramProvider';
var inputClassName = 'mikopbx-module-input';
/* global globalRootUrl, globalTranslate, Form, Config, $ */

var ModuleTelegramProvider = {
  $formObj: $('#' + idForm),
  $checkBoxes: $('#' + idForm + ' .ui.checkbox'),
  $dropDowns: $('#' + idForm + ' .ui.dropdown'),
  saveTableAJAXUrl: window.location.origin + globalRootUrl + idUrl + "/saveTableData",
  deleteRecordAJAXUrl: window.location.origin + globalRootUrl + idUrl + "/delete",
  $disabilityFields: $('#' + idForm + '  .disability'),
  $statusToggle: $('#module-status-toggle'),
  $moduleStatus: $('#status'),
  authProcess: '',
  statusesTimer: null,
  eventSource: {},

  /**
   * Field validation rules
   * https://semantic-ui.com/behaviors/form.html
   */
  validateRules: {
    textField: {
      identifier: 'text_field',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.mod_tplValidateValueIsEmpty
      }]
    },
    areaField: {
      identifier: 'text_area_field',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.mod_tplValidateValueIsEmpty
      }]
    },
    passwordField: {
      identifier: 'password_field',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.mod_tplValidateValueIsEmpty
      }]
    }
  },

  /**
   * On page load we init some Semantic UI library
   */
  initialize: function initialize() {
    // инициализируем чекбоксы и выподающие менюшки
    window[className].$checkBoxes.checkbox();
    window[className].$dropDowns.dropdown();
    window.addEventListener('ModuleStatusChanged', window[className].checkStatusToggle);
    window[className].initializeForm();
    $('.menu .item').tab({
      'onVisible': function onVisible(tab) {
        var el = $("#step3");

        if (tab === 'first') {
          el.show();
        } else {
          el.hide();
        }
      }
    });
    $.get("".concat(window.location.origin).concat(globalRootUrl).concat(idUrl, "/getTablesDescription"), function (result) {
      for (var key in result['data']) {
        var tableName = key + '-table';

        if ($('#' + tableName).attr('id') === undefined) {
          continue;
        }

        window[className].initTable(tableName, result['data'][key]);
      }
    });
    window[className].checkStatusToggle();
    window[className].initEventSource('telegram-provider');
  },
  initEventSource: function initEventSource(chan) {
    var url = "".concat(window.location.origin, "/pbxcore/api/nchan/sub/").concat(chan, "?token=").concat($('#api_hash').val());
    window[className].eventSource[chan] = new EventSource(url, {
      withCredentials: true
    });
    window[className].eventSource[chan].onmessage = window[className].onPbxMessage; // window[className].eventSource[chan].onerror   = window[className].onPbxMessageError;
  },
  onPbxMessage: function onPbxMessage(event) {
    var statusData;

    try {
      statusData = $.parseJSON(event.data);
    } catch (e) {
      return;
    }

    var elDimmer = $('#dimmer-wait-status');

    if (statusData.status === 'Done') {//
    } else if (statusData.status === 'START_AUTH') {
      elDimmer.addClass('active');
    } else if (statusData.status === 'END_AUTH') {
      elDimmer.removeClass('active');
    } else if (statusData.status === 'WaitInput' && statusData.data.trim() === '') {
      var translateStatus = globalTranslate[statusData.output];

      if (translateStatus === undefined) {
        translateStatus = statusData.output;
      }

      $('#command-dialog form div.field label').text(translateStatus);
      $('input[id=command]').val('');
      var title = globalTranslate["module_telegram_provider_" + statusData.app] + " (".concat(statusData.phone, ")");
      $('#command-dialog a.ui.ribbon.label').text(title);
      $('#command-dialog').modal({
        closable: false,
        onDeny: function onDeny() {
          $.get('/pbxcore/api/modules/' + className + '/cancel-auth?login=' + statusData.phone);
        },
        onApprove: function onApprove() {
          var elCommand = $('#command');
          var command = elCommand.val();
          elCommand.val('');
          $.get('/pbxcore/api/modules/' + className + '/enter-command?login=' + statusData.phone + '&command=' + command + '&key=' + statusData.app);
        }
      }).modal('show');
    } else if (statusData.status === 'Error') {
      $("#error-message").show();
      $("#error-message .header").text(globalTranslate.module_telegram_providerError);
      $("#error-message .body").text(statusData.output);
    }
  },

  /*
  Проверка статусов линий
   */
  checkStatuses: function checkStatuses() {
    $.get('/pbxcore/api/modules/' + className + '/statuses', function (response) {
      var haveDisable = false;

      for (var id in response.data) {
        var uriButton = $('#' + className + '-table tr[id=' + id + '] button.ui.button');
        var elements = {
          'gw': $('#' + className + '-table tr[id=' + id + '] a[data-name="login-gw"] i'),
          'user': $('#' + className + '-table tr[id=' + id + '] a[data-name="login-user"] i'),
          'bot': $('#' + className + '-table tr[id=' + id + '] a[data-name="login-bot"] i')
        };

        for (var keyElement in elements) {
          var elButton = elements[keyElement];
          $('#' + className + '-table tr[id=' + id + '] a[data-name="login-' + keyElement + '"]').attr('data-tooltip', globalTranslate['module_telegram_provider_status_' + keyElement + '_' + response['data'][id][keyElement]]);

          if (response['data'][id][keyElement] === 'OK') {
            elButton.removeClass('red orange');
            elButton.addClass('green');

            if (keyElement === 'gw') {
              uriButton.show();
            }
          } else if (response['data'][id][keyElement] === 'WAIT_START') {
            elButton.removeClass('green red');
            elButton.addClass('orange');

            if (keyElement === 'gw') {
              haveDisable = true;
              uriButton.hide();
            }
          } else {
            elButton.removeClass('green orange');
            elButton.addClass('red');

            if (keyElement === 'gw') {
              haveDisable = true;
              uriButton.hide();
            }
          }
        }
      }

      if (haveDisable === true) {
        window[className].changeStatus('NotAllConnected');
      } else {
        window[className].changeStatus('Connected');
      }

      if (window[className].statusesTimer !== 0) {
        window[className].statusesTimer = null;
        setTimeout(window[className].checkStatusToggle, 10000);
      }
    });
  },

  /**
   * Запуск процесса авторизации.
   * @param id
   * @param failAuth
   */
  startAuth: function startAuth(id, failAuth) {
    if (window[className].statusesTimer !== null) {
      // Останавливаем проверку статусов.
      clearTimeout(window[className].statusesTimer);
      window[className].statusesTimer = 0;
    }

    $("#error-message").hide();
    $.get('/pbxcore/api/modules/' + className + '/start-auth?id=' + id + '&type=' + window[className].authProcess, function (response) {
      if (response.result === false) {
        console.log(response);
        $("#error-message").show();
        $("#error-message .header").text(globalTranslate.module_telegram_providerError);
        $("#error-message .body").text('');
        return;
      }
    });
  },

  /**
   *
   * @param selectType
   * @param selected
   * @returns {[{name: string, value: string, selected: boolean}]}
   */
  makeDropdownList: function makeDropdownList(selectType, selected) {
    var values = [{
      name: ' --- ',
      value: '',
      selected: '' === selected
    }];
    $('#' + selectType + ' option').each(function (index, obj) {
      values.push({
        name: obj.text,
        value: obj.value,
        selected: selected === obj.value
      });
    });
    return values;
  },

  /**
   * Обработка изменения группы в списке
   */
  changeGroupInList: function changeGroupInList(value, text, choice) {
    var tdInput = $(choice).closest('td').find('input');
    tdInput.attr('data-value', value);
    tdInput.attr('value', value);
    var currentRowId = $(choice).closest('tr').attr('id');
    var tableName = $(choice).closest('table').attr('id').replace('-table', '');

    if (currentRowId !== undefined && tableName !== undefined) {
      window[className].sendChangesToServer(tableName, currentRowId);
    }
  },

  /**
   * Add new Table.
   */
  initTable: function initTable(tableName, options) {
    var columns = [];
    var columnsArray4Sort = [];

    for (var colName in options['cols']) {
      columns.push({
        data: colName
      });
      columnsArray4Sort.push(colName);
    }

    $('#' + tableName).DataTable({
      ajax: {
        url: "".concat(window.location.origin).concat(globalRootUrl).concat(idUrl).concat(options.ajaxUrl, "?table=") + tableName.replace('-table', ''),
        dataSrc: 'data'
      },
      columns: columns,
      paging: false,
      sDom: 'rtip',
      deferRender: true,
      pageLength: 17,
      infoCallback: function infoCallback(settings, start, end, max, total, pre) {
        return '';
      },
      language: SemanticLocalization.dataTableLocalisation,
      ordering: false,

      /**
       * Builder row presentation
       * @param row
       * @param data
       */
      createdRow: function createdRow(row, data) {
        var cols = $('td', row);
        var headers = $('#' + tableName + ' thead tr th');

        for (var key in data) {
          var index = columnsArray4Sort.indexOf(key);

          if (key === 'rowIcon') {
            cols.eq(index).html('<i class="ui ' + data[key] + ' circle icon"></i>');
          } else if (key === 'delButton') {
            var uri = '127.0.0.1:' + (30000 + 1 * data.DT_RowId);
            var templateDeleteButton = '<div class="ui small basic icon buttons action-buttons">' + '<button data-name="uri-button" class="ui button clipboard disability" data-tooltip="' + globalTranslate.module_telegram_providerCopy + '"  data-position="left center" data-clipboard-text="' + uri + '" style="display: none;">sip:' + uri + '</button>' + '<a data-name="login-gw"  href="" class="ui button popuped"><i class="icon telegram"></i></a>' + '<a data-name="login-user"  href="" class="ui button popuped"><i class="icon envelope"></i></a>' + '<a data-name="login-bot"  href="" class="ui button popuped"><i class="icon android secret"></i></a>' + '<a data-name="delete-button" href="' + window[className].deleteRecordAJAXUrl + '/' + data.DT_RowId + '" data-value = "' + data.DT_RowId + '"' + ' class="ui button delete two-steps-delete popuped" data-tooltip="' + globalTranslate.module_telegram_provider_action_remove + '" data-content="' + globalTranslate.bt_ToolTipDelete + '">' + '<i class="icon trash red"></i></a></div>';
            cols.eq(index).html(templateDeleteButton);
            cols.eq(index).addClass('right aligned');
          } else if (key === 'priority') {
            cols.eq(index).addClass('dragHandle');
            cols.eq(index).html('<i class="ui sort circle icon"></i>'); // Приоритет устанавливаем для строки.

            $(row).attr('m-priority', data[key]);
          } else {
            var template = '<div class="ui transparent fluid input inline-edit">' + '<input colName="' + key + '" class="' + inputClassName + '" type="text" data-value="' + data[key] + '" value="' + data[key] + '"></div>';
            $('td', row).eq(index).html(template);
          }

          if (options['cols'][key] === undefined) {
            continue;
          }

          var additionalClass = options['cols'][key]['class'];

          if (additionalClass !== undefined && additionalClass !== '') {
            headers.eq(index).addClass(additionalClass);
          }

          var header = options['cols'][key]['header'];

          if (header !== undefined && header !== '') {
            headers.eq(index).html(header);
          }

          var selectMetaData = options['cols'][key]['select'];

          if (selectMetaData !== undefined) {
            var newTemplate = $('#template-select').html().replace('PARAM', data[key]);

            var _template = '<input class="' + inputClassName + '" colName="' + key + '" selectType="' + selectMetaData + '" style="display: none;" type="text" data-value="' + data[key] + '" value="' + data[key] + '"></div>';

            cols.eq(index).html(newTemplate + _template);
          }
        }
      },

      /**
       * Draw event - fired once the table has completed a draw.
       */
      drawCallback: function drawCallback(settings) {
        window[className].drowSelectGroup(settings.sTableId);
      }
    });
    var body = $('body'); // Клик по полю. Вход для редактирования значения.

    body.on('focusin', '.' + inputClassName, function (e) {
      $(e.target).transition('glow');
      $(e.target).closest('div').removeClass('transparent').addClass('changed-field');
      $(e.target).attr('readonly', false);
    }); // Отправка формы на сервер по Enter или Tab

    $(document).on('keydown', function (e) {
      var keyCode = e.keyCode || e.which;

      if (keyCode === 13 || keyCode === 9 && $(':focus').hasClass('mikopbx-module-input')) {
        window[className].endEditInput();
      }
    });
    body.on('click', 'a[data-name="login-gw"]', function (e) {
      e.preventDefault();
      window[className].authProcess = 'gw';
      var currentRowId = $(e.target).closest('tr').attr('id');
      window[className].startAuth(currentRowId);
    });
    body.on('click', 'a[data-name="login-user"]', function (e) {
      e.preventDefault();
      window[className].authProcess = 'user';
      var currentRowId = $(e.target).closest('tr').attr('id');
      window[className].startAuth(currentRowId);
    });
    body.on('click', 'a[data-name="login-bot"]', function (e) {
      e.preventDefault();
      window[className].authProcess = 'bot';
      var currentRowId = $(e.target).closest('tr').attr('id');
      window[className].startAuth(currentRowId);
    });
    body.on('click', 'button[data-name="uri-button"]', function (e) {
      e.preventDefault();
    });
    body.on('click', 'a.delete', function (e) {
      e.preventDefault();
      var currentRowId = $(e.target).closest('tr').attr('id');
      var elTableName = $(e.target).closest('table').attr('id').replace('-table', '');
      window[className].deleteRow(elTableName, currentRowId);
    }); // Добавление новой строки

    var clipboard = new ClipboardJS('.clipboard');
    clipboard.on('error', function (e) {
      console.error('Action:', e.action);
      console.error('Trigger:', e.trigger);
    }); // Отправка формы на сервер по уходу с поля ввода

    body.on('focusout', '.' + inputClassName, window[className].endEditInput); // Кнопка "Добавить новую запись"

    $('[id-table = "' + tableName + '"]').on('click', window[className].addNewRow);
  },

  /**
   * Перемещение строки, изменение приоритета.
   */
  cbOnDrop: function cbOnDrop(table, row) {
    var priorityWasChanged = false;
    var priorityData = {};
    $(table).find('tr').each(function (index, obj) {
      var ruleId = $(obj).attr('id');
      var oldPriority = parseInt($(obj).attr('m-priority'), 10);
      var newPriority = obj.rowIndex;

      if (!isNaN(ruleId) && oldPriority !== newPriority) {
        priorityWasChanged = true;
        priorityData[ruleId] = newPriority;
      }
    });

    if (priorityWasChanged) {
      $.api({
        on: 'now',
        url: "".concat(globalRootUrl).concat(idUrl, "/changePriority?table=") + $(table).attr('id').replace('-table', ''),
        method: 'POST',
        data: priorityData
      });
    }
  },

  /**
   * Окончание редактирования поля ввода.
   * Не относится к select.
   * @param e
   */
  endEditInput: function endEditInput(e) {
    var $el = $('.changed-field').closest('tr');
    $el.each(function (index, obj) {
      var currentRowId = $(obj).attr('id');
      var tableName = $(obj).closest('table').attr('id').replace('-table', '');

      if (currentRowId !== undefined && tableName !== undefined) {
        window[className].sendChangesToServer(tableName, currentRowId);
      }
    });
  },

  /**
   * Добавление новой строки в таблицу.
   * @param e
   */
  addNewRow: function addNewRow(e) {
    var idTable = $(e.target).attr('id-table');
    var table = $('#' + idTable);
    e.preventDefault();
    table.find('.dataTables_empty').remove(); // Отправим на запись все что не записано еще

    var $el = table.find('.changed-field').closest('tr');
    $el.each(function (index, obj) {
      var currentRowId = $(obj).attr('id');

      if (currentRowId !== undefined) {
        window[className].sendChangesToServer(currentRowId);
      }
    });
    var id = "new" + Math.floor(Math.random() * Math.floor(500));
    var rowTemplate = '<tr id="' + id + '" role="row" class="even">' + table.find('tr#TEMPLATE').html().replace('TEMPLATE', id) + '</tr>';
    table.find('tbody > tr:first').before(rowTemplate);
    window[className].drowSelectGroup(idTable);
  },

  /**
   * Обновление select элементов.
   * @param tableId
   */
  drowSelectGroup: function drowSelectGroup(tableId) {
    $('#' + tableId).find('tr#TEMPLATE').hide();
    var selestGroup = $('.select-group');
    selestGroup.each(function (index, obj) {
      var selectType = $(obj).closest('td').find('input').attr('selectType');
      $(obj).dropdown({
        values: window[className].makeDropdownList(selectType, $(obj).attr('data-value'))
      });
    });
    selestGroup.dropdown({
      onChange: window[className].changeGroupInList
    });
    $('#' + tableId).tableDnD({
      onDrop: window[className].cbOnDrop,
      onDragClass: 'hoveringRow',
      dragHandle: '.dragHandle'
    });
  },

  /**
   * Удаление строки
   * @param tableName
   * @param id - record id
   */
  deleteRow: function deleteRow(tableName, id) {
    var table = $('#' + tableName + '-table');

    if (id.substr(0, 3) === 'new') {
      table.find('tr#' + id).remove();
      return;
    }

    $.api({
      url: window[className].deleteRecordAJAXUrl + '?id=' + id + '&table=' + tableName,
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (tableName === 'ModuleTelegramProvider' && $('#' + tableName + '-table tbody tr').length === 2) {
          $('#' + tableName + '-table tbody tr[id=' + id + '] input[colname="phone_number"]').val('');
          return;
        }

        if (response.success) {
          table.find('tr#' + id).remove();

          if (table.find('tbody > tr').length === 0) {
            table.find('tbody').append('<tr class="odd"></tr>');
          }
        }
      }
    });

    if (tableName === 'ModuleTelegramProvider') {
      var phone = $("#" + tableName + "-table tr[id=" + id + "] input[colname=phone_number]").val();
      $.get('/pbxcore/api/modules/' + className + '/logout?id=' + id + '&phone=' + phone);
    }
  },

  /**
   * Отправка данных на сервер при измении
   * @param tableName
   * @param recordId
   * @returns {boolean}
   */
  sendChangesToServer: function sendChangesToServer(tableName, recordId) {
    var data = {
      'pbx-table-id': tableName,
      'pbx-row-id': recordId
    };
    var notEmpty = false;
    $("tr#" + recordId + ' .' + inputClassName).each(function (index, obj) {
      var colName = $(obj).attr('colName');

      if (colName !== undefined) {
        data[$(obj).attr('colName')] = $(obj).val();

        if ($(obj).val() !== '') {
          notEmpty = true;
        }
      }
    });

    if (notEmpty === false) {
      return;
    }

    $("tr#" + recordId + " .user.circle").removeClass('user circle').addClass('spinner loading');

    if (window[className].savingRowTable === true) {
      // Уже идет другое сохранение.
      return;
    }

    window[className].savingRowTable = true;
    $.api({
      url: window[className].saveTableAJAXUrl,
      on: 'now',
      method: 'POST',
      data: data,
      successTest: function successTest(response) {
        return response !== undefined && Object.keys(response).length > 0 && response.success === true;
      },
      onSuccess: function onSuccess(response) {
        window[className].savingRowTable = false;

        if (response.data !== undefined) {
          var rowId = response.data['pbx-row-id'];
          var table = $('#' + response.data['pbx-table-id'] + '-table');
          table.find("tr#" + rowId + " input").attr('readonly', true);
          table.find("tr#" + rowId + " div").removeClass('changed-field loading').addClass('transparent');
          table.find("tr#" + rowId + " .spinner.loading").addClass('user circle').removeClass('spinner loading');

          if (rowId !== response.data['newId']) {
            $("tr#".concat(rowId)).attr('id', response.data['newId']);
          }
        }
      },
      onFailure: function onFailure(response) {
        window[className].savingRowTable = false;

        if (response.message !== undefined) {
          UserMessage.showMultiString(response.message);
        }

        $("tr#" + recordId + " .spinner.loading").addClass('user circle').removeClass('spinner loading');
      },
      onError: function onError(errorMessage, element, xhr) {
        window[className].savingRowTable = false;

        if (xhr.status === 403) {
          window.location = globalRootUrl + "session/index";
        }
      }
    });
  },

  /**
   * Change some form elements classes depends of module status
   */
  checkStatusToggle: function checkStatusToggle() {
    var step3 = $("#step3");

    if (window[className].$statusToggle.checkbox('is checked')) {
      window[className].$disabilityFields.removeClass('disabled');
      step3.removeClass('disabled');
      window[className].$moduleStatus.show();

      if (window[className].statusesTimer === null) {
        window[className].statusesTimer = 1;
        window[className].checkStatuses();
      }
    } else {
      window[className].$disabilityFields.addClass('disabled');
      step3.addClass('disabled');
      window[className].$moduleStatus.hide();
    }
  },

  /**
   * Send command to restart module workers after data changes,
   * Also we can do it on TemplateConf->modelsEventChangeData method
   */
  applyConfigurationChanges: function applyConfigurationChanges() {
    window[className].changeStatus('Updating');
    $.api({
      url: "".concat(Config.pbxUrl, "/pbxcore/api/modules/") + className + "/reload",
      on: 'now',
      successTest: function successTest(response) {
        // test whether a JSON response is valid
        return Object.keys(response).length > 0 && response.result === true;
      },
      onSuccess: function onSuccess() {
        window[className].changeStatus('Connected');
      },
      onFailure: function onFailure() {
        window[className].changeStatus('Disconnected');
      }
    });
  },

  /**
   * We can modify some data before form send
   * @param settings
   * @returns {*}
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = window[className].$formObj.form('get values');
    return result;
  },

  /**
   * Some actions after forms send
   */
  cbAfterSendForm: function cbAfterSendForm() {
    window[className].applyConfigurationChanges();
  },

  /**
   * Initialize form parameters
   */
  initializeForm: function initializeForm() {
    Form.$formObj = window[className].$formObj;
    Form.url = "".concat(globalRootUrl).concat(idUrl, "/save");
    Form.validateRules = window[className].validateRules;
    Form.cbBeforeSendForm = window[className].cbBeforeSendForm;
    Form.cbAfterSendForm = window[className].cbAfterSendForm;
    Form.initialize();
  },

  /**
   * Update the module state on form label
   * @param status
   */
  changeStatus: function changeStatus(status) {
    switch (status) {
      case 'NotAllConnected':
        window[className].$moduleStatus.removeClass('grey').removeClass('red').removeClass('green').addClass('orange');
        window[className].$moduleStatus.html(globalTranslate.module_telegram_providerNotAllConnected);
        break;

      case 'Connected':
        window[className].$moduleStatus.removeClass('grey').removeClass('red').removeClass('orange').addClass('green');
        window[className].$moduleStatus.html(globalTranslate.module_telegram_providerConnected);
        break;

      case 'Disconnected':
        window[className].$moduleStatus.removeClass('green').removeClass('red').removeClass('orange').addClass('grey');
        window[className].$moduleStatus.html(globalTranslate.module_telegram_providerDisconnected);
        break;

      case 'Updating':
        window[className].$moduleStatus.removeClass('green').removeClass('red').removeClass('orange').addClass('grey');
        window[className].$moduleStatus.html("<i class=\"spinner loading icon\"></i>".concat(globalTranslate.module_telegram_providerUpdateStatus));
        break;

      default:
        window[className].$moduleStatus.removeClass('green').removeClass('red').removeClass('orange').addClass('grey');
        window[className].$moduleStatus.html(globalTranslate.module_telegram_providerDisconnected);
        break;
    }
  }
};
$(document).ready(function () {
  window[className].initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtdGVsZWdyYW0tcHJvdmlkZXItaW5kZXguanMiXSwibmFtZXMiOlsiaWRVcmwiLCJpZEZvcm0iLCJjbGFzc05hbWUiLCJpbnB1dENsYXNzTmFtZSIsIk1vZHVsZVRlbGVncmFtUHJvdmlkZXIiLCIkZm9ybU9iaiIsIiQiLCIkY2hlY2tCb3hlcyIsIiRkcm9wRG93bnMiLCJzYXZlVGFibGVBSkFYVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiJHN0YXR1c1RvZ2dsZSIsIiRtb2R1bGVTdGF0dXMiLCJhdXRoUHJvY2VzcyIsInN0YXR1c2VzVGltZXIiLCJldmVudFNvdXJjZSIsInZhbGlkYXRlUnVsZXMiLCJ0ZXh0RmllbGQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibW9kX3RwbFZhbGlkYXRlVmFsdWVJc0VtcHR5IiwiYXJlYUZpZWxkIiwicGFzc3dvcmRGaWVsZCIsImluaXRpYWxpemUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNoZWNrU3RhdHVzVG9nZ2xlIiwiaW5pdGlhbGl6ZUZvcm0iLCJ0YWIiLCJlbCIsInNob3ciLCJoaWRlIiwiZ2V0IiwicmVzdWx0Iiwia2V5IiwidGFibGVOYW1lIiwiYXR0ciIsInVuZGVmaW5lZCIsImluaXRUYWJsZSIsImluaXRFdmVudFNvdXJjZSIsImNoYW4iLCJ1cmwiLCJ2YWwiLCJFdmVudFNvdXJjZSIsIndpdGhDcmVkZW50aWFscyIsIm9ubWVzc2FnZSIsIm9uUGJ4TWVzc2FnZSIsImV2ZW50Iiwic3RhdHVzRGF0YSIsInBhcnNlSlNPTiIsImRhdGEiLCJlIiwiZWxEaW1tZXIiLCJzdGF0dXMiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwidHJpbSIsInRyYW5zbGF0ZVN0YXR1cyIsIm91dHB1dCIsInRleHQiLCJ0aXRsZSIsImFwcCIsInBob25lIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImVsQ29tbWFuZCIsImNvbW1hbmQiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJFcnJvciIsImNoZWNrU3RhdHVzZXMiLCJyZXNwb25zZSIsImhhdmVEaXNhYmxlIiwiaWQiLCJ1cmlCdXR0b24iLCJlbGVtZW50cyIsImtleUVsZW1lbnQiLCJlbEJ1dHRvbiIsImNoYW5nZVN0YXR1cyIsInNldFRpbWVvdXQiLCJzdGFydEF1dGgiLCJmYWlsQXV0aCIsImNsZWFyVGltZW91dCIsImNvbnNvbGUiLCJsb2ciLCJtYWtlRHJvcGRvd25MaXN0Iiwic2VsZWN0VHlwZSIsInNlbGVjdGVkIiwidmFsdWVzIiwibmFtZSIsInZhbHVlIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicHVzaCIsImNoYW5nZUdyb3VwSW5MaXN0IiwiY2hvaWNlIiwidGRJbnB1dCIsImNsb3Nlc3QiLCJmaW5kIiwiY3VycmVudFJvd0lkIiwicmVwbGFjZSIsInNlbmRDaGFuZ2VzVG9TZXJ2ZXIiLCJvcHRpb25zIiwiY29sdW1ucyIsImNvbHVtbnNBcnJheTRTb3J0IiwiY29sTmFtZSIsIkRhdGFUYWJsZSIsImFqYXgiLCJhamF4VXJsIiwiZGF0YVNyYyIsInBhZ2luZyIsInNEb20iLCJkZWZlclJlbmRlciIsInBhZ2VMZW5ndGgiLCJpbmZvQ2FsbGJhY2siLCJzZXR0aW5ncyIsInN0YXJ0IiwiZW5kIiwibWF4IiwidG90YWwiLCJwcmUiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXJpbmciLCJjcmVhdGVkUm93Iiwicm93IiwiY29scyIsImhlYWRlcnMiLCJpbmRleE9mIiwiZXEiLCJodG1sIiwidXJpIiwiRFRfUm93SWQiLCJ0ZW1wbGF0ZURlbGV0ZUJ1dHRvbiIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckNvcHkiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJfYWN0aW9uX3JlbW92ZSIsImJ0X1Rvb2xUaXBEZWxldGUiLCJ0ZW1wbGF0ZSIsImFkZGl0aW9uYWxDbGFzcyIsImhlYWRlciIsInNlbGVjdE1ldGFEYXRhIiwibmV3VGVtcGxhdGUiLCJkcmF3Q2FsbGJhY2siLCJkcm93U2VsZWN0R3JvdXAiLCJzVGFibGVJZCIsImJvZHkiLCJvbiIsInRhcmdldCIsInRyYW5zaXRpb24iLCJkb2N1bWVudCIsImtleUNvZGUiLCJ3aGljaCIsImhhc0NsYXNzIiwiZW5kRWRpdElucHV0IiwicHJldmVudERlZmF1bHQiLCJlbFRhYmxlTmFtZSIsImRlbGV0ZVJvdyIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwiZXJyb3IiLCJhY3Rpb24iLCJ0cmlnZ2VyIiwiYWRkTmV3Um93IiwiY2JPbkRyb3AiLCJ0YWJsZSIsInByaW9yaXR5V2FzQ2hhbmdlZCIsInByaW9yaXR5RGF0YSIsInJ1bGVJZCIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsInJvd0luZGV4IiwiaXNOYU4iLCJhcGkiLCJtZXRob2QiLCIkZWwiLCJpZFRhYmxlIiwicmVtb3ZlIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwicm93VGVtcGxhdGUiLCJiZWZvcmUiLCJ0YWJsZUlkIiwic2VsZXN0R3JvdXAiLCJvbkNoYW5nZSIsInRhYmxlRG5EIiwib25Ecm9wIiwib25EcmFnQ2xhc3MiLCJkcmFnSGFuZGxlIiwic3Vic3RyIiwib25TdWNjZXNzIiwibGVuZ3RoIiwic3VjY2VzcyIsImFwcGVuZCIsInJlY29yZElkIiwibm90RW1wdHkiLCJzYXZpbmdSb3dUYWJsZSIsInN1Y2Nlc3NUZXN0IiwiT2JqZWN0Iiwia2V5cyIsInJvd0lkIiwib25GYWlsdXJlIiwibWVzc2FnZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwib25FcnJvciIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGVwMyIsImFwcGx5Q29uZmlndXJhdGlvbkNoYW5nZXMiLCJDb25maWciLCJwYnhVcmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJOb3RBbGxDb25uZWN0ZWQiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJDb25uZWN0ZWQiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJEaXNjb25uZWN0ZWQiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJVcGRhdGVTdGF0dXMiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLEtBQUssR0FBTywwQkFBbEI7QUFDQSxJQUFNQyxNQUFNLEdBQU0sK0JBQWxCO0FBQ0EsSUFBTUMsU0FBUyxHQUFHLHdCQUFsQjtBQUNBLElBQU1DLGNBQWMsR0FBRyxzQkFBdkI7QUFFQTs7QUFDQSxJQUFNQyxzQkFBc0IsR0FBRztBQUM5QkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsTUFBSUwsTUFBTCxDQURtQjtBQUU5Qk0sRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsTUFBSUwsTUFBSixHQUFXLGVBQVosQ0FGZ0I7QUFHOUJPLEVBQUFBLFVBQVUsRUFBRUYsQ0FBQyxDQUFDLE1BQUlMLE1BQUosR0FBVyxlQUFaLENBSGlCO0FBSTlCUSxFQUFBQSxnQkFBZ0IsRUFBRUMsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQixHQUF1QkMsYUFBdkIsR0FBdUNiLEtBQXZDLEdBQStDLGdCQUpuQztBQUs5QmMsRUFBQUEsbUJBQW1CLEVBQUVKLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEIsR0FBdUJDLGFBQXZCLEdBQXVDYixLQUF2QyxHQUErQyxTQUx0QztBQU05QmUsRUFBQUEsaUJBQWlCLEVBQUVULENBQUMsQ0FBQyxNQUFJTCxNQUFKLEdBQVcsZUFBWixDQU5VO0FBTzlCZSxFQUFBQSxhQUFhLEVBQUVWLENBQUMsQ0FBQyx1QkFBRCxD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QWxCLENBQWdDNEgsSUFBaEMsaURBQTRFbEgsZUFBZSxDQUFDNk0sb0NBQTVGO0FBQ0E7O0FBQ0Q7QUFDQzlOLFFBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCZSxhQUFsQixDQUNFK0MsV0FERixDQUNjLE9BRGQsRUFFRUEsV0FGRixDQUVjLEtBRmQsRUFHRUEsV0FIRixDQUdjLFFBSGQsRUFJRUQsUUFKRixDQUlXLE1BSlg7QUFLQXJELFFBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCZSxhQUFsQixDQUFnQzRILElBQWhDLENBQXFDbEgsZUFBZSxDQUFDNE0sb0NBQXJEO0FBQ0E7QUF4Q0Y7QUEwQ0E7QUF4cUI2QixDQUEvQjtBQTJxQkFqTyxDQUFDLENBQUMwSixRQUFELENBQUQsQ0FBWXlFLEtBQVosQ0FBa0IsWUFBTTtBQUN2Qi9OLEVBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCNkIsVUFBbEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMSAyMDE4XG4gKlxuICovXG5jb25zdCBpZFVybCAgICAgPSAnbW9kdWxlLXRlbGVncmFtLXByb3ZpZGVyJztcbmNvbnN0IGlkRm9ybSAgICA9ICdtb2R1bGUtdGVsZWdyYW0tcHJvdmlkZXItZm9ybSc7XG5jb25zdCBjbGFzc05hbWUgPSAnTW9kdWxlVGVsZWdyYW1Qcm92aWRlcic7XG5jb25zdCBpbnB1dENsYXNzTmFtZSA9ICdtaWtvcGJ4LW1vZHVsZS1pbnB1dCc7XG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIENvbmZpZywgJCAqL1xuY29uc3QgTW9kdWxlVGVsZWdyYW1Qcm92aWRlciA9IHtcblx0JGZvcm1PYmo6ICQoJyMnK2lkRm9ybSksXG5cdCRjaGVja0JveGVzOiAkKCcjJytpZEZvcm0rJyAudWkuY2hlY2tib3gnKSxcblx0JGRyb3BEb3duczogJCgnIycraWRGb3JtKycgLnVpLmRyb3Bkb3duJyksXG5cdHNhdmVUYWJsZUFKQVhVcmw6IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4rZ2xvYmFsUm9vdFVybCArIGlkVXJsICsgXCIvc2F2ZVRhYmxlRGF0YVwiLFxuXHRkZWxldGVSZWNvcmRBSkFYVXJsOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luK2dsb2JhbFJvb3RVcmwgKyBpZFVybCArIFwiL2RlbGV0ZVwiLFxuXHQkZGlzYWJpbGl0eUZpZWxkczogJCgnIycraWRGb3JtKycgIC5kaXNhYmlsaXR5JyksXG5cdCRzdGF0dXNUb2dnbGU6ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLFxuXHQkbW9kdWxlU3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cdGF1dGhQcm9jZXNzOiAnJyxcblx0c3RhdHVzZXNUaW1lcjogbnVsbCxcblx0ZXZlbnRTb3VyY2U6IHt9LFxuXHQvKipcblx0ICogRmllbGQgdmFsaWRhdGlvbiBydWxlc1xuXHQgKiBodHRwczovL3NlbWFudGljLXVpLmNvbS9iZWhhdmlvcnMvZm9ybS5odG1sXG5cdCAqL1xuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0dGV4dEZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndGV4dF9maWVsZCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tb2RfdHBsVmFsaWRhdGVWYWx1ZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0YXJlYUZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndGV4dF9hcmVhX2ZpZWxkJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1vZF90cGxWYWxpZGF0ZVZhbHVlSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwYXNzd29yZEZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGFzc3dvcmRfZmllbGQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubW9kX3RwbFZhbGlkYXRlVmFsdWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHQvKipcblx0ICogT24gcGFnZSBsb2FkIHdlIGluaXQgc29tZSBTZW1hbnRpYyBVSSBsaWJyYXJ5XG5cdCAqL1xuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINC40L3QuNGG0LjQsNC70LjQt9C40YDRg9C10Lwg0YfQtdC60LHQvtC60YHRiyDQuCDQstGL0L/QvtC00LDRjtGJ0LjQtSDQvNC10L3RjtGI0LrQuFxuXHRcdHdpbmRvd1tjbGFzc05hbWVdLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgd2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNUb2dnbGUpO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnLm1lbnUgLml0ZW0nKS50YWIoe1xuXHRcdFx0J29uVmlzaWJsZSc6ICh0YWIpID0+IHtcblx0XHRcdFx0bGV0IGVsID0gJChcIiNzdGVwM1wiKTtcblx0XHRcdFx0aWYodGFiID09PSAnZmlyc3QnKXtcblx0XHRcdFx0XHRlbC5zaG93KCk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGVsLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdCQuZ2V0KCBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9nZXRUYWJsZXNEZXNjcmlwdGlvbmAsIGZ1bmN0aW9uKCByZXN1bHQgKSB7XG5cdFx0XHRmb3IgKGxldCBrZXkgaW4gcmVzdWx0WydkYXRhJ10pIHtcblx0XHRcdFx0bGV0IHRhYmxlTmFtZSA9IGtleSArICctdGFibGUnO1xuXHRcdFx0XHRpZiggJCgnIycrdGFibGVOYW1lKS5hdHRyKCdpZCcpID09PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmluaXRUYWJsZSh0YWJsZU5hbWUsIHJlc3VsdFsnZGF0YSddW2tleV0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmNoZWNrU3RhdHVzVG9nZ2xlKCk7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uaW5pdEV2ZW50U291cmNlKCd0ZWxlZ3JhbS1wcm92aWRlcicpXG5cdH0sXG5cblx0aW5pdEV2ZW50U291cmNlOiBmdW5jdGlvbiAoY2hhbikge1xuXHRcdGxldCB1cmwgPSBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufS9wYnhjb3JlL2FwaS9uY2hhbi9zdWIvJHtjaGFufT90b2tlbj0keyQoJyNhcGlfaGFzaCcpLnZhbCgpfWA7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uZXZlbnRTb3VyY2VbY2hhbl0gPSBuZXcgRXZlbnRTb3VyY2UodXJsLCB7XG5cdFx0XHR3aXRoQ3JlZGVudGlhbHM6IHRydWVcblx0XHR9KTtcblx0XHR3aW5kb3dbY2xhc3NOYW1lXS5ldmVudFNvdXJjZVtjaGFuXS5vbm1lc3NhZ2UgPSB3aW5kb3dbY2xhc3NOYW1lXS5vblBieE1lc3NhZ2U7XG5cdFx0Ly8gd2luZG93W2NsYXNzTmFtZV0uZXZlbnRTb3VyY2VbY2hhbl0ub25lcnJvciAgID0gd2luZG93W2NsYXNzTmFtZV0ub25QYnhNZXNzYWdlRXJyb3I7XG5cdH0sXG5cdG9uUGJ4TWVzc2FnZTogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRsZXQgc3RhdHVzRGF0YTtcblx0XHR0cnl7XG5cdFx0XHRzdGF0dXNEYXRhID0gJC5wYXJzZUpTT04oZXZlbnQuZGF0YSk7XG5cdFx0fWNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxldCBlbERpbW1lciA9ICQoJyNkaW1tZXItd2FpdC1zdGF0dXMnKTtcblx0XHRpZihzdGF0dXNEYXRhLnN0YXR1cyA9PT0gJ0RvbmUnKXtcblx0XHRcdC8vXG5cdFx0fWVsc2UgaWYoc3RhdHVzRGF0YS5zdGF0dXMgPT09ICdTVEFSVF9BVVRIJyl7XG5cdFx0XHRlbERpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0fWVsc2UgaWYoc3RhdHVzRGF0YS5zdGF0dXMgPT09ICdFTkRfQVVUSCcpe1xuXHRcdFx0ZWxEaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdH1lbHNlIGlmKHN0YXR1c0RhdGEuc3RhdHVzID09PSAnV2FpdElucHV0JyAmJiBzdGF0dXNEYXRhLmRhdGEudHJpbSgpID09PSAnJyl7XG5cdFx0XHRsZXQgdHJhbnNsYXRlU3RhdHVzID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXR1c0RhdGEub3V0cHV0XTtcblx0XHRcdGlmKHRyYW5zbGF0ZVN0YXR1cyA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0dHJhbnNsYXRlU3RhdHVzID0gc3RhdHVzRGF0YS5vdXRwdXQ7XG5cdFx0XHR9XG5cdFx0XHQkKCcjY29tbWFuZC1kaWFsb2cgZm9ybSBkaXYuZmllbGQgbGFiZWwnKS50ZXh0KHRyYW5zbGF0ZVN0YXR1cyk7XG5cdFx0XHQkKCdpbnB1dFtpZD1jb21tYW5kXScpLnZhbCgnJyk7XG5cdFx0XHRsZXQgdGl0bGUgPSBnbG9iYWxUcmFuc2xhdGVbXCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJfXCIgKyBzdGF0dXNEYXRhLmFwcF0gKyBgICgke3N0YXR1c0RhdGEucGhvbmV9KWA7XG5cdFx0XHQkKCcjY29tbWFuZC1kaWFsb2cgYS51aS5yaWJib24ubGFiZWwnKS50ZXh0KHRpdGxlKTtcblx0XHRcdCQoJyNjb21tYW5kLWRpYWxvZycpXG5cdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0Y2xvc2FibGUgIDogZmFsc2UsXG5cdFx0XHRcdFx0b25EZW55ICAgIDogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdCQuZ2V0KCAnL3BieGNvcmUvYXBpL21vZHVsZXMvJytjbGFzc05hbWUrJy9jYW5jZWwtYXV0aD9sb2dpbj0nK3N0YXR1c0RhdGEucGhvbmUpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25BcHByb3ZlIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRsZXQgZWxDb21tYW5kID0gJCgnI2NvbW1hbmQnKTtcblx0XHRcdFx0XHRcdGxldCBjb21tYW5kID0gZWxDb21tYW5kLnZhbCgpO1xuXHRcdFx0XHRcdFx0ZWxDb21tYW5kLnZhbCgnJyk7XG5cdFx0XHRcdFx0XHQkLmdldCggJy9wYnhjb3JlL2FwaS9tb2R1bGVzLycrY2xhc3NOYW1lKycvZW50ZXItY29tbWFuZD9sb2dpbj0nK3N0YXR1c0RhdGEucGhvbmUrJyZjb21tYW5kPScrY29tbWFuZCsnJmtleT0nK3N0YXR1c0RhdGEuYXBwKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHR9ZWxzZSBpZihzdGF0dXNEYXRhLnN0YXR1cyA9PT0gJ0Vycm9yJyl7XG5cdFx0XHQkKFwiI2Vycm9yLW1lc3NhZ2VcIikuc2hvdygpO1xuXHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5oZWFkZXJcIikudGV4dChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyRXJyb3IpO1xuXHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5ib2R5XCIpLnRleHQoc3RhdHVzRGF0YS5vdXRwdXQpO1xuXHRcdH1cblx0fSxcblx0Lypcblx00J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQvtCyINC70LjQvdC40Llcblx0ICovXG5cdGNoZWNrU3RhdHVzZXMoKXtcbiAgICAgICAgJC5nZXQoICcvcGJ4Y29yZS9hcGkvbW9kdWxlcy8nK2NsYXNzTmFtZSsnL3N0YXR1c2VzJywgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0bGV0IGhhdmVEaXNhYmxlID0gZmFsc2U7XG5cdFx0XHRmb3IgKGxldCBpZCBpbiByZXNwb25zZS5kYXRhKSB7XG5cdFx0XHRcdGxldCB1cmlCdXR0b24gXHRcdD0gJCgnIycrY2xhc3NOYW1lKyctdGFibGUgdHJbaWQ9JytpZCsnXSBidXR0b24udWkuYnV0dG9uJyk7XG5cdFx0XHRcdGxldCBlbGVtZW50cyA9IHtcblx0XHRcdFx0XHQnZ3cnOiAkKCcjJytjbGFzc05hbWUrJy10YWJsZSB0cltpZD0nK2lkKyddIGFbZGF0YS1uYW1lPVwibG9naW4tZ3dcIl0gaScpLFxuXHRcdFx0XHRcdCd1c2VyJzogJCgnIycrY2xhc3NOYW1lKyctdGFibGUgdHJbaWQ9JytpZCsnXSBhW2RhdGEtbmFtZT1cImxvZ2luLXVzZXJcIl0gaScpLFxuXHRcdFx0XHRcdCdib3QnOiAkKCcjJytjbGFzc05hbWUrJy10YWJsZSB0cltpZD0nK2lkKyddIGFbZGF0YS1uYW1lPVwibG9naW4tYm90XCJdIGknKVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRmb3IgKGxldCBrZXlFbGVtZW50IGluIGVsZW1lbnRzKSB7XG5cdFx0XHRcdFx0bGV0IGVsQnV0dG9uICA9IGVsZW1lbnRzW2tleUVsZW1lbnRdO1xuXHRcdFx0XHRcdCQoJyMnK2NsYXNzTmFtZSsnLXRhYmxlIHRyW2lkPScraWQrJ10gYVtkYXRhLW5hbWU9XCJsb2dpbi0nK2tleUVsZW1lbnQrJ1wiXScpLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZVsnbW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyX3N0YXR1c18nK2tleUVsZW1lbnQrJ18nK3Jlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdIF0pO1xuXHRcdFx0XHRcdGlmKHJlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdID09PSAnT0snKSB7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5yZW1vdmVDbGFzcygncmVkIG9yYW5nZScpO1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24uYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0XHRcdFx0XHRpZiAoa2V5RWxlbWVudCA9PT0gJ2d3Jykge1xuXHRcdFx0XHRcdFx0XHR1cmlCdXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1lbHNlIGlmKHJlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdID09PSAnV0FJVF9TVEFSVCcpe1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24ucmVtb3ZlQ2xhc3MoJ2dyZWVuIHJlZCcpO1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24uYWRkQ2xhc3MoJ29yYW5nZScpO1xuXHRcdFx0XHRcdFx0aWYoa2V5RWxlbWVudD09PSdndycpe1xuXHRcdFx0XHRcdFx0XHRoYXZlRGlzYWJsZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdHVyaUJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5yZW1vdmVDbGFzcygnZ3JlZW4gb3JhbmdlJyk7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5hZGRDbGFzcygncmVkJyk7XG5cdFx0XHRcdFx0XHRpZihrZXlFbGVtZW50PT09J2d3Jyl7XG5cdFx0XHRcdFx0XHRcdGhhdmVEaXNhYmxlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0dXJpQnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cbiAgICAgICAgICAgIH1cblx0XHRcdGlmKGhhdmVEaXNhYmxlID09PSB0cnVlKXtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdOb3RBbGxDb25uZWN0ZWQnKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3RlZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih3aW5kb3dbY2xhc3NOYW1lXS5zdGF0dXNlc1RpbWVyICE9PSAwKXtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9IG51bGw7XG5cdFx0XHRcdHNldFRpbWVvdXQod2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNUb2dnbGUsIDEwMDAwKTtcblx0XHRcdH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC/0YDQvtGG0LXRgdGB0LAg0LDQstGC0L7RgNC40LfQsNGG0LjQuC5cblx0ICogQHBhcmFtIGlkXG5cdCAqIEBwYXJhbSBmYWlsQXV0aFxuXHQgKi9cblx0c3RhcnRBdXRoKGlkLCBmYWlsQXV0aCkge1xuXHRcdGlmKHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXIgIT09IG51bGwpe1xuXHRcdFx0Ly8g0J7RgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0L/RgNC+0LLQtdGA0LrRgyDRgdGC0LDRgtGD0YHQvtCyLlxuXHRcdFx0Y2xlYXJUaW1lb3V0KHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXIpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9IDA7XG5cdFx0fVxuXHRcdCQoXCIjZXJyb3ItbWVzc2FnZVwiKS5oaWRlKCk7XG5cdFx0JC5nZXQoICcvcGJ4Y29yZS9hcGkvbW9kdWxlcy8nK2NsYXNzTmFtZSsnL3N0YXJ0LWF1dGg/aWQ9JytpZCsnJnR5cGU9Jyt3aW5kb3dbY2xhc3NOYW1lXS5hdXRoUHJvY2VzcywgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYocmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZSl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcblx0XHRcdFx0JChcIiNlcnJvci1tZXNzYWdlXCIpLnNob3coKTtcblx0XHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5oZWFkZXJcIikudGV4dChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyRXJyb3IpO1xuXHRcdFx0XHQkKFwiI2Vycm9yLW1lc3NhZ2UgLmJvZHlcIikudGV4dCgnJyk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICpcblx0ICogQHBhcmFtIHNlbGVjdFR5cGVcblx0ICogQHBhcmFtIHNlbGVjdGVkXG5cdCAqIEByZXR1cm5zIHtbe25hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZywgc2VsZWN0ZWQ6IGJvb2xlYW59XX1cblx0ICovXG5cdG1ha2VEcm9wZG93bkxpc3Qoc2VsZWN0VHlwZSwgc2VsZWN0ZWQpIHtcblx0XHRjb25zdCB2YWx1ZXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6ICcgLS0tICcsXG5cdFx0XHRcdHZhbHVlOiAnJyxcblx0XHRcdFx0c2VsZWN0ZWQ6ICgnJyA9PT0gc2VsZWN0ZWQpLFxuXHRcdFx0fVxuXHRcdF07XG5cdFx0JCgnIycrc2VsZWN0VHlwZSsnIG9wdGlvbicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdHZhbHVlcy5wdXNoKHtcblx0XHRcdFx0bmFtZTogb2JqLnRleHQsXG5cdFx0XHRcdHZhbHVlOiBvYmoudmFsdWUsXG5cdFx0XHRcdHNlbGVjdGVkOiAoc2VsZWN0ZWQgPT09IG9iai52YWx1ZSksXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gdmFsdWVzO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINC40LfQvNC10L3QtdC90LjRjyDQs9GA0YPQv9C/0Ysg0LIg0YHQv9C40YHQutC1XG5cdCAqL1xuXHRjaGFuZ2VHcm91cEluTGlzdCh2YWx1ZSwgdGV4dCwgY2hvaWNlKSB7XG5cdFx0bGV0IHRkSW5wdXQgPSAkKGNob2ljZSkuY2xvc2VzdCgndGQnKS5maW5kKCdpbnB1dCcpO1xuXHRcdHRkSW5wdXQuYXR0cignZGF0YS12YWx1ZScsIFx0dmFsdWUpO1xuXHRcdHRkSW5wdXQuYXR0cigndmFsdWUnLCBcdFx0dmFsdWUpO1xuXHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGNob2ljZSkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdGxldCB0YWJsZU5hbWUgICAgPSAkKGNob2ljZSkuY2xvc2VzdCgndGFibGUnKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy10YWJsZScsICcnKTtcblx0XHRpZiAoY3VycmVudFJvd0lkICE9PSB1bmRlZmluZWQgJiYgdGFibGVOYW1lICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIodGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWRkIG5ldyBUYWJsZS5cblx0ICovXG5cdGluaXRUYWJsZSh0YWJsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRsZXQgY29sdW1ucyA9IFtdO1xuXHRcdGxldCBjb2x1bW5zQXJyYXk0U29ydCA9IFtdXG5cdFx0Zm9yIChsZXQgY29sTmFtZSBpbiBvcHRpb25zWydjb2xzJ10pIHtcblx0XHRcdGNvbHVtbnMucHVzaCgge2RhdGE6IGNvbE5hbWV9KTtcblx0XHRcdGNvbHVtbnNBcnJheTRTb3J0LnB1c2goY29sTmFtZSk7XG5cdFx0fVxuXHRcdCQoJyMnICsgdGFibGVOYW1lKS5EYXRhVGFibGUoIHtcblx0XHRcdGFqYXg6IHtcblx0XHRcdFx0dXJsOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfSR7b3B0aW9ucy5hamF4VXJsfT90YWJsZT1gK3RhYmxlTmFtZS5yZXBsYWNlKCctdGFibGUnLCAnJyksXG5cdFx0XHRcdGRhdGFTcmM6ICdkYXRhJ1xuXHRcdFx0fSxcblx0XHRcdGNvbHVtbnM6IGNvbHVtbnMsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0c0RvbTogJ3J0aXAnLFxuXHRcdFx0ZGVmZXJSZW5kZXI6IHRydWUsXG5cdFx0XHRwYWdlTGVuZ3RoOiAxNyxcblx0XHRcdGluZm9DYWxsYmFjayggc2V0dGluZ3MsIHN0YXJ0LCBlbmQsIG1heCwgdG90YWwsIHByZSApIHtcblx0XHRcdFx0cmV0dXJuICcnO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0XHRvcmRlcmluZzogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEJ1aWxkZXIgcm93IHByZXNlbnRhdGlvblxuXHRcdFx0ICogQHBhcmFtIHJvd1xuXHRcdFx0ICogQHBhcmFtIGRhdGFcblx0XHRcdCAqL1xuXHRcdFx0Y3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcblx0XHRcdFx0bGV0IGNvbHMgICAgPSAkKCd0ZCcsIHJvdyk7XG5cdFx0XHRcdGxldCBoZWFkZXJzID0gJCgnIycrIHRhYmxlTmFtZSArICcgdGhlYWQgdHIgdGgnKTtcblx0XHRcdFx0Zm9yIChsZXQga2V5IGluIGRhdGEpIHtcblx0XHRcdFx0XHRsZXQgaW5kZXggPSBjb2x1bW5zQXJyYXk0U29ydC5pbmRleE9mKGtleSk7XG5cdFx0XHRcdFx0aWYoa2V5ID09PSAncm93SWNvbicpe1xuXHRcdFx0XHRcdFx0Y29scy5lcShpbmRleCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSAnICsgZGF0YVtrZXldICsgJyBjaXJjbGUgaWNvblwiPjwvaT4nKTtcblx0XHRcdFx0XHR9ZWxzZSBpZihrZXkgPT09ICdkZWxCdXR0b24nKXtcblx0XHRcdFx0XHRcdGxldCB1cmkgPSAnMTI3LjAuMC4xOicrKDMwMDAwKzEqZGF0YS5EVF9Sb3dJZCk7XG5cdFx0XHRcdFx0XHRsZXQgdGVtcGxhdGVEZWxldGVCdXR0b24gPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPicgK1xuXHRcdFx0XHRcdFx0XHQnPGJ1dHRvbiBkYXRhLW5hbWU9XCJ1cmktYnV0dG9uXCIgY2xhc3M9XCJ1aSBidXR0b24gY2xpcGJvYXJkIGRpc2FiaWxpdHlcIiBkYXRhLXRvb2x0aXA9XCInK2dsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJDb3B5KydcIiAgZGF0YS1wb3NpdGlvbj1cImxlZnQgY2VudGVyXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIicrdXJpKydcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+c2lwOicrdXJpKyc8L2J1dHRvbj4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwibG9naW4tZ3dcIiAgaHJlZj1cIlwiIGNsYXNzPVwidWkgYnV0dG9uIHBvcHVwZWRcIj48aSBjbGFzcz1cImljb24gdGVsZWdyYW1cIj48L2k+PC9hPicrXG5cdFx0XHRcdFx0XHRcdCc8YSBkYXRhLW5hbWU9XCJsb2dpbi11c2VyXCIgIGhyZWY9XCJcIiBjbGFzcz1cInVpIGJ1dHRvbiBwb3B1cGVkXCI+PGkgY2xhc3M9XCJpY29uIGVudmVsb3BlXCI+PC9pPjwvYT4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwibG9naW4tYm90XCIgIGhyZWY9XCJcIiBjbGFzcz1cInVpIGJ1dHRvbiBwb3B1cGVkXCI+PGkgY2xhc3M9XCJpY29uIGFuZHJvaWQgc2VjcmV0XCI+PC9pPjwvYT4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwiZGVsZXRlLWJ1dHRvblwiIGhyZWY9XCInICsgd2luZG93W2NsYXNzTmFtZV0uZGVsZXRlUmVjb3JkQUpBWFVybCArICcvJyArXG5cdFx0XHRcdFx0XHRcdGRhdGEuRFRfUm93SWQgKyAnXCIgZGF0YS12YWx1ZSA9IFwiJyArIGRhdGEuRFRfUm93SWQgKyAnXCInICtcblx0XHRcdFx0XHRcdFx0JyBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgZGF0YS10b29sdGlwPVwiJytnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyX2FjdGlvbl9yZW1vdmUrJ1wiIGRhdGEtY29udGVudD1cIicgKyBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSArICdcIj4nICtcblx0XHRcdFx0XHRcdFx0JzxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPjwvZGl2Pic7XG5cdFx0XHRcdFx0XHRjb2xzLmVxKGluZGV4KS5odG1sKHRlbXBsYXRlRGVsZXRlQnV0dG9uKTtcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cdFx0XHRcdFx0fWVsc2UgaWYoa2V5ID09PSAncHJpb3JpdHknKXtcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmFkZENsYXNzKCdkcmFnSGFuZGxlJylcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmh0bWwoJzxpIGNsYXNzPVwidWkgc29ydCBjaXJjbGUgaWNvblwiPjwvaT4nKTtcblx0XHRcdFx0XHRcdC8vINCf0YDQuNC+0YDQuNGC0LXRgiDRg9GB0YLQsNC90LDQstC70LjQstCw0LXQvCDQtNC70Y8g0YHRgtGA0L7QutC4LlxuXHRcdFx0XHRcdFx0JChyb3cpLmF0dHIoJ20tcHJpb3JpdHknLCBkYXRhW2tleV0pO1xuXHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0bGV0IHRlbXBsYXRlID0gJzxkaXYgY2xhc3M9XCJ1aSB0cmFuc3BhcmVudCBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdFwiPicgK1xuXHRcdFx0XHRcdFx0XHQnPGlucHV0IGNvbE5hbWU9XCInK2tleSsnXCIgY2xhc3M9XCInK2lucHV0Q2xhc3NOYW1lKydcIiB0eXBlPVwidGV4dFwiIGRhdGEtdmFsdWU9XCInK2RhdGFba2V5XSArICdcIiB2YWx1ZT1cIicgKyBkYXRhW2tleV0gKyAnXCI+PC9kaXY+Jztcblx0XHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcShpbmRleCkuaHRtbCh0ZW1wbGF0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKG9wdGlvbnNbJ2NvbHMnXVtrZXldID09PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBhZGRpdGlvbmFsQ2xhc3MgPSBvcHRpb25zWydjb2xzJ11ba2V5XVsnY2xhc3MnXTtcblx0XHRcdFx0XHRpZihhZGRpdGlvbmFsQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBhZGRpdGlvbmFsQ2xhc3MgIT09ICcnKXtcblx0XHRcdFx0XHRcdGhlYWRlcnMuZXEoaW5kZXgpLmFkZENsYXNzKGFkZGl0aW9uYWxDbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBoZWFkZXIgPSBvcHRpb25zWydjb2xzJ11ba2V5XVsnaGVhZGVyJ107XG5cdFx0XHRcdFx0aWYoaGVhZGVyICE9PSB1bmRlZmluZWQgJiYgaGVhZGVyICE9PSAnJyl7XG5cdFx0XHRcdFx0XHRoZWFkZXJzLmVxKGluZGV4KS5odG1sKGhlYWRlcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bGV0IHNlbGVjdE1ldGFEYXRhID0gb3B0aW9uc1snY29scyddW2tleV1bJ3NlbGVjdCddO1xuXHRcdFx0XHRcdGlmKHNlbGVjdE1ldGFEYXRhICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0bGV0IG5ld1RlbXBsYXRlID0gJCgnI3RlbXBsYXRlLXNlbGVjdCcpLmh0bWwoKS5yZXBsYWNlKCdQQVJBTScsIGRhdGFba2V5XSk7XG5cdFx0XHRcdFx0XHRsZXQgdGVtcGxhdGUgPSAnPGlucHV0IGNsYXNzPVwiJytpbnB1dENsYXNzTmFtZSsnXCIgY29sTmFtZT1cIicra2V5KydcIiBzZWxlY3RUeXBlPVwiJytzZWxlY3RNZXRhRGF0YSsnXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiIHR5cGU9XCJ0ZXh0XCIgZGF0YS12YWx1ZT1cIicrZGF0YVtrZXldICsgJ1wiIHZhbHVlPVwiJyArIGRhdGFba2V5XSArICdcIj48L2Rpdj4nO1xuXHRcdFx0XHRcdFx0Y29scy5lcShpbmRleCkuaHRtbChuZXdUZW1wbGF0ZSArIHRlbXBsYXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cblx0XHRcdCAqL1xuXHRcdFx0ZHJhd0NhbGxiYWNrKHNldHRpbmdzKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmRyb3dTZWxlY3RHcm91cChzZXR0aW5ncy5zVGFibGVJZCk7XG5cdFx0XHR9LFxuXHRcdH0gKTtcblxuXHRcdGxldCBib2R5ID0gJCgnYm9keScpO1xuXHRcdC8vINCa0LvQuNC6INC/0L4g0L/QvtC70Y4uINCS0YXQvtC0INC00LvRjyDRgNC10LTQsNC60YLQuNGA0L7QstCw0L3QuNGPINC30L3QsNGH0LXQvdC40Y8uXG5cdFx0Ym9keS5vbignZm9jdXNpbicsICcuJytpbnB1dENsYXNzTmFtZSwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdCQoZS50YXJnZXQpLnRyYW5zaXRpb24oJ2dsb3cnKTtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCd0cmFuc3BhcmVudCcpLmFkZENsYXNzKCdjaGFuZ2VkLWZpZWxkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5hdHRyKCdyZWFkb25seScsIGZhbHNlKTtcblx0XHR9KVxuXHRcdC8vINCe0YLQv9GA0LDQstC60LAg0YTQvtGA0LzRiyDQvdCwINGB0LXRgNCy0LXRgCDQv9C+IEVudGVyINC40LvQuCBUYWJcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXQga2V5Q29kZSA9IGUua2V5Q29kZSB8fCBlLndoaWNoO1xuXHRcdFx0aWYgKGtleUNvZGUgPT09IDEzIHx8IGtleUNvZGUgPT09IDkgJiYgJCgnOmZvY3VzJykuaGFzQ2xhc3MoJ21pa29wYngtbW9kdWxlLWlucHV0JykpIHtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uZW5kRWRpdElucHV0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRib2R5Lm9uKCdjbGljaycsICdhW2RhdGEtbmFtZT1cImxvZ2luLWd3XCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ2d3Jztcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5zdGFydEF1dGgoY3VycmVudFJvd0lkKTtcblx0XHR9KTtcdFx0XG5cdFx0Ym9keS5vbignY2xpY2snLCAnYVtkYXRhLW5hbWU9XCJsb2dpbi11c2VyXCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ3VzZXInO1xuXHRcdFx0bGV0IGN1cnJlbnRSb3dJZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnN0YXJ0QXV0aChjdXJyZW50Um93SWQpO1xuXHRcdH0pO1xuXHRcdGJvZHkub24oJ2NsaWNrJywgJ2FbZGF0YS1uYW1lPVwibG9naW4tYm90XCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ2JvdCc7XG5cdFx0XHRsZXQgY3VycmVudFJvd0lkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhcnRBdXRoKGN1cnJlbnRSb3dJZCk7XG5cdFx0fSk7XG5cdFx0Ym9keS5vbignY2xpY2snLCAnYnV0dG9uW2RhdGEtbmFtZT1cInVyaS1idXR0b25cIl0nLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0pO1xuXHRcdGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHRsZXQgZWxUYWJsZU5hbWUgICAgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0YWJsZScpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uZGVsZXRlUm93KGVsVGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdH0pOyAvLyDQlNC+0LHQsNCy0LvQtdC90LjQtSDQvdC+0LLQvtC5INGB0YLRgNC+0LrQuFxuXG5cdFx0bGV0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuXHRcdGNsaXBib2FyZC5vbignZXJyb3InLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcblx0XHR9KTtcblx0XHQvLyDQntGC0L/RgNCw0LLQutCwINGE0L7RgNC80Ysg0L3QsCDRgdC10YDQstC10YAg0L/QviDRg9GF0L7QtNGDINGBINC/0L7Qu9GPINCy0LLQvtC00LBcblx0XHRib2R5Lm9uKCdmb2N1c291dCcsICcuJytpbnB1dENsYXNzTmFtZSwgd2luZG93W2NsYXNzTmFtZV0uZW5kRWRpdElucHV0KTtcblxuXHRcdC8vINCa0L3QvtC/0LrQsCBcItCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YPRjiDQt9Cw0L/QuNGB0YxcIlxuXHRcdCQoJ1tpZC10YWJsZSA9IFwiJyt0YWJsZU5hbWUrJ1wiXScpLm9uKCdjbGljaycsIHdpbmRvd1tjbGFzc05hbWVdLmFkZE5ld1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LzQtdGJ0LXQvdC40LUg0YHRgtGA0L7QutC4LCDQuNC30LzQtdC90LXQvdC40LUg0L/RgNC40L7RgNC40YLQtdGC0LAuXG5cdCAqL1xuXHRjYk9uRHJvcCh0YWJsZSwgcm93KSB7XG5cdFx0bGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuXHRcdGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuXHRcdCQodGFibGUpLmZpbmQoJ3RyJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdtLXByaW9yaXR5JyksIDEwKTtcblx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0aWYgKCFpc05hTiggcnVsZUlkICkgJiYgb2xkUHJpb3JpdHkgIT09IG5ld1ByaW9yaXR5KSB7XG5cdFx0XHRcdHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdHByaW9yaXR5RGF0YVtydWxlSWRdID0gbmV3UHJpb3JpdHk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYgKHByaW9yaXR5V2FzQ2hhbmdlZCkge1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9jaGFuZ2VQcmlvcml0eT90YWJsZT1gKyQodGFibGUpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpLFxuXHRcdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YTogcHJpb3JpdHlEYXRhLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiDQntC60L7QvdGH0LDQvdC40LUg0YDQtdC00LDQutGC0LjRgNC+0LLQsNC90LjRjyDQv9C+0LvRjyDQstCy0L7QtNCwLlxuXHQgKiDQndC1INC+0YLQvdC+0YHQuNGC0YHRjyDQuiBzZWxlY3QuXG5cdCAqIEBwYXJhbSBlXG5cdCAqL1xuXHRlbmRFZGl0SW5wdXQoZSl7XG5cdFx0bGV0ICRlbCA9ICQoJy5jaGFuZ2VkLWZpZWxkJykuY2xvc2VzdCgndHInKTtcblx0XHQkZWwuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG9iaikge1xuXHRcdFx0bGV0IGN1cnJlbnRSb3dJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0bGV0IHRhYmxlTmFtZSAgICA9ICQob2JqKS5jbG9zZXN0KCd0YWJsZScpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpO1xuXHRcdFx0aWYgKGN1cnJlbnRSb3dJZCAhPT0gdW5kZWZpbmVkICYmIHRhYmxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIodGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvQtdC90LjQtSDQvdC+0LLQvtC5INGB0YLRgNC+0LrQuCDQsiDRgtCw0LHQu9C40YbRgy5cblx0ICogQHBhcmFtIGVcblx0ICovXG5cdGFkZE5ld1JvdyhlKXtcblx0XHRsZXQgaWRUYWJsZSA9ICQoZS50YXJnZXQpLmF0dHIoJ2lkLXRhYmxlJyk7XG5cdFx0bGV0IHRhYmxlICAgPSAkKCcjJytpZFRhYmxlKTtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGFibGUuZmluZCgnLmRhdGFUYWJsZXNfZW1wdHknKS5yZW1vdmUoKTtcblx0XHQvLyDQntGC0L/RgNCw0LLQuNC8INC90LAg0LfQsNC/0LjRgdGMINCy0YHQtSDRh9GC0L4g0L3QtSDQt9Cw0L/QuNGB0LDQvdC+INC10YnQtVxuXHRcdGxldCAkZWwgPSB0YWJsZS5maW5kKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0JGVsLmVhY2goZnVuY3Rpb24gKGluZGV4LCBvYmopIHtcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdGlmIChjdXJyZW50Um93SWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5zZW5kQ2hhbmdlc1RvU2VydmVyKGN1cnJlbnRSb3dJZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0bGV0IGlkID0gXCJuZXdcIitNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBNYXRoLmZsb29yKDUwMCkpO1xuXHRcdGxldCByb3dUZW1wbGF0ZSA9ICc8dHIgaWQ9XCInK2lkKydcIiByb2xlPVwicm93XCIgY2xhc3M9XCJldmVuXCI+Jyt0YWJsZS5maW5kKCd0ciNURU1QTEFURScpLmh0bWwoKS5yZXBsYWNlKCdURU1QTEFURScsIGlkKSsnPC90cj4nO1xuXHRcdHRhYmxlLmZpbmQoJ3Rib2R5ID4gdHI6Zmlyc3QnKS5iZWZvcmUocm93VGVtcGxhdGUpO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmRyb3dTZWxlY3RHcm91cChpZFRhYmxlKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1IHNlbGVjdCDRjdC70LXQvNC10L3RgtC+0LIuXG5cdCAqIEBwYXJhbSB0YWJsZUlkXG5cdCAqL1xuXHRkcm93U2VsZWN0R3JvdXAodGFibGVJZCkge1xuXHRcdCQoJyMnICsgdGFibGVJZCkuZmluZCgndHIjVEVNUExBVEUnKS5oaWRlKCk7XG5cdFx0bGV0IHNlbGVzdEdyb3VwID0gJCgnLnNlbGVjdC1ncm91cCcpO1xuXHRcdHNlbGVzdEdyb3VwLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGxldCBzZWxlY3RUeXBlID0gJChvYmopLmNsb3Nlc3QoJ3RkJykuZmluZCgnaW5wdXQnKS5hdHRyKCdzZWxlY3RUeXBlJyk7XG5cdFx0XHQkKG9iaikuZHJvcGRvd24oe1xuXHRcdFx0XHR2YWx1ZXM6IHdpbmRvd1tjbGFzc05hbWVdLm1ha2VEcm9wZG93bkxpc3Qoc2VsZWN0VHlwZSwgJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSksXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRzZWxlc3RHcm91cC5kcm9wZG93bih7XG5cdFx0XHRvbkNoYW5nZTogd2luZG93W2NsYXNzTmFtZV0uY2hhbmdlR3JvdXBJbkxpc3QsXG5cdFx0fSk7XG5cblx0XHQkKCcjJyArIHRhYmxlSWQpLnRhYmxlRG5EKHtcblx0XHRcdG9uRHJvcDogd2luZG93W2NsYXNzTmFtZV0uY2JPbkRyb3AsXG5cdFx0XHRvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93Jyxcblx0XHRcdGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INGB0YLRgNC+0LrQuFxuXHQgKiBAcGFyYW0gdGFibGVOYW1lXG5cdCAqIEBwYXJhbSBpZCAtIHJlY29yZCBpZFxuXHQgKi9cblx0ZGVsZXRlUm93KHRhYmxlTmFtZSwgaWQpIHtcblx0XHRsZXQgdGFibGUgPSAkKCcjJysgdGFibGVOYW1lKyctdGFibGUnKTtcblx0XHRpZiAoaWQuc3Vic3RyKDAsMykgPT09ICduZXcnKSB7XG5cdFx0XHR0YWJsZS5maW5kKCd0ciMnK2lkKS5yZW1vdmUoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiB3aW5kb3dbY2xhc3NOYW1lXS5kZWxldGVSZWNvcmRBSkFYVXJsKyc/aWQ9JytpZCsnJnRhYmxlPScrdGFibGVOYW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmKHRhYmxlTmFtZSA9PT0gJ01vZHVsZVRlbGVncmFtUHJvdmlkZXInICYmICQoJyMnKyB0YWJsZU5hbWUrJy10YWJsZSB0Ym9keSB0cicpLmxlbmd0aCA9PT0gMil7XG5cdFx0XHRcdFx0JCgnIycrIHRhYmxlTmFtZSsnLXRhYmxlIHRib2R5IHRyW2lkPScraWQrJ10gaW5wdXRbY29sbmFtZT1cInBob25lX251bWJlclwiXScpLnZhbCgnJyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0dGFibGUuZmluZCgndHIjJytpZCkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0aWYgKHRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRcdHRhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCc8dHIgY2xhc3M9XCJvZGRcIj48L3RyPicpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmKHRhYmxlTmFtZSA9PT0gJ01vZHVsZVRlbGVncmFtUHJvdmlkZXInKXtcblx0XHRcdGxldCBwaG9uZSA9ICQoXCIjXCIrIHRhYmxlTmFtZStcIi10YWJsZSB0cltpZD1cIitpZCtcIl0gaW5wdXRbY29sbmFtZT1waG9uZV9udW1iZXJdXCIpLnZhbCgpO1xuXHRcdFx0JC5nZXQoICcvcGJ4Y29yZS9hcGkvbW9kdWxlcy8nK2NsYXNzTmFtZSsnL2xvZ291dD9pZD0nK2lkKycmcGhvbmU9JytwaG9uZSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiDQntGC0L/RgNCw0LLQutCwINC00LDQvdC90YvRhSDQvdCwINGB0LXRgNCy0LXRgCDQv9GA0Lgg0LjQt9C80LXQvdC40Lhcblx0ICogQHBhcmFtIHRhYmxlTmFtZVxuXHQgKiBAcGFyYW0gcmVjb3JkSWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRzZW5kQ2hhbmdlc1RvU2VydmVyKHRhYmxlTmFtZSwgcmVjb3JkSWQpIHtcblx0XHRsZXQgZGF0YSA9IHsgJ3BieC10YWJsZS1pZCc6IHRhYmxlTmFtZSwgJ3BieC1yb3ctaWQnOiAgcmVjb3JkSWR9O1xuXHRcdGxldCBub3RFbXB0eSA9IGZhbHNlO1xuXHRcdCQoXCJ0ciNcIityZWNvcmRJZCArICcgLicgKyBpbnB1dENsYXNzTmFtZSkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG9iaikge1xuXHRcdFx0bGV0IGNvbE5hbWUgPSAkKG9iaikuYXR0cignY29sTmFtZScpO1xuXHRcdFx0aWYoY29sTmFtZSAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0ZGF0YVskKG9iaikuYXR0cignY29sTmFtZScpXSA9ICQob2JqKS52YWwoKTtcblx0XHRcdFx0aWYoJChvYmopLnZhbCgpICE9PSAnJyl7XG5cdFx0XHRcdFx0bm90RW1wdHkgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYobm90RW1wdHkgPT09IGZhbHNlKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JChcInRyI1wiK3JlY29yZElkK1wiIC51c2VyLmNpcmNsZVwiKS5yZW1vdmVDbGFzcygndXNlciBjaXJjbGUnKS5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG5cdFx0aWYod2luZG93W2NsYXNzTmFtZV0uc2F2aW5nUm93VGFibGUgPT09IHRydWUpe1xuXHRcdFx0Ly8g0KPQttC1INC40LTQtdGCINC00YDRg9Cz0L7QtSDRgdC+0YXRgNCw0L3QtdC90LjQtS5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uc2F2aW5nUm93VGFibGUgPSB0cnVlO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogd2luZG93W2NsYXNzTmFtZV0uc2F2ZVRhYmxlQUpBWFVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5kYXRhICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRsZXQgcm93SWQgPSByZXNwb25zZS5kYXRhWydwYngtcm93LWlkJ107XG5cdFx0XHRcdFx0bGV0IHRhYmxlID0gJCgnIycrcmVzcG9uc2UuZGF0YVsncGJ4LXRhYmxlLWlkJ10rJy10YWJsZScpO1xuXHRcdFx0XHRcdHRhYmxlLmZpbmQoXCJ0ciNcIiArIHJvd0lkICsgXCIgaW5wdXRcIikuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcblx0XHRcdFx0XHR0YWJsZS5maW5kKFwidHIjXCIgKyByb3dJZCArIFwiIGRpdlwiKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCBsb2FkaW5nJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XG5cdFx0XHRcdFx0dGFibGUuZmluZChcInRyI1wiICsgcm93SWQgKyBcIiAuc3Bpbm5lci5sb2FkaW5nXCIpLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblxuXHRcdFx0XHRcdGlmIChyb3dJZCAhPT0gcmVzcG9uc2UuZGF0YVsnbmV3SWQnXSl7XG5cdFx0XHRcdFx0XHQkKGB0ciMke3Jvd0lkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YVsnbmV3SWQnXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JChcInRyI1wiICsgcmVjb3JkSWQgKyBcIiAuc3Bpbm5lci5sb2FkaW5nXCIpLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgXCJzZXNzaW9uL2luZGV4XCI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIENoYW5nZSBzb21lIGZvcm0gZWxlbWVudHMgY2xhc3NlcyBkZXBlbmRzIG9mIG1vZHVsZSBzdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzVG9nZ2xlKCkge1xuXHRcdGxldCBzdGVwMyA9ICQoXCIjc3RlcDNcIik7XG5cdFx0aWYgKHdpbmRvd1tjbGFzc05hbWVdLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRzdGVwMy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXMuc2hvdygpO1xuXHRcdFx0aWYod2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9PT0gbnVsbCl7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXI9MTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNlcygpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHN0ZXAzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogU2VuZCBjb21tYW5kIHRvIHJlc3RhcnQgbW9kdWxlIHdvcmtlcnMgYWZ0ZXIgZGF0YSBjaGFuZ2VzLFxuXHQgKiBBbHNvIHdlIGNhbiBkbyBpdCBvbiBUZW1wbGF0ZUNvbmYtPm1vZGVsc0V2ZW50Q2hhbmdlRGF0YSBtZXRob2Rcblx0ICovXG5cdGFwcGx5Q29uZmlndXJhdGlvbkNoYW5nZXMoKSB7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdVcGRhdGluZycpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9gK2NsYXNzTmFtZStgL3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3RlZCcpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdEaXNjb25uZWN0ZWQnKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBXZSBjYW4gbW9kaWZ5IHNvbWUgZGF0YSBiZWZvcmUgZm9ybSBzZW5kXG5cdCAqIEBwYXJhbSBzZXR0aW5nc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHdpbmRvd1tjbGFzc05hbWVdLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHQvKipcblx0ICogU29tZSBhY3Rpb25zIGFmdGVyIGZvcm1zIHNlbmRcblx0ICovXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHR3aW5kb3dbY2xhc3NOYW1lXS5hcHBseUNvbmZpZ3VyYXRpb25DaGFuZ2VzKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGZvcm0gcGFyYW1ldGVyc1xuXHQgKi9cblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHdpbmRvd1tjbGFzc05hbWVdLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSB3aW5kb3dbY2xhc3NOYW1lXS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHdpbmRvd1tjbGFzc05hbWVdLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB3aW5kb3dbY2xhc3NOYW1lXS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGUgdGhlIG1vZHVsZSBzdGF0ZSBvbiBmb3JtIGxhYmVsXG5cdCAqIEBwYXJhbSBzdGF0dXNcblx0ICovXG5cdGNoYW5nZVN0YXR1cyhzdGF0dXMpIHtcblx0XHRzd2l0Y2ggKHN0YXR1cykge1xuXHRcdFx0Y2FzZSAnTm90QWxsQ29ubmVjdGVkJzpcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnZ3JleScpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnZ3JlZW4nKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnb3JhbmdlJyk7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyTm90QWxsQ29ubmVjdGVkKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdDb25uZWN0ZWQnOlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmV5Jylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3JlZCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdvcmFuZ2UnKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JlZW4nKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJDb25uZWN0ZWQpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Rpc2Nvbm5lY3RlZCc6XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2dyZWVuJylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3JlZCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdvcmFuZ2UnKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JleScpO1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckRpc2Nvbm5lY3RlZCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnVXBkYXRpbmcnOlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmVlbicpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnb3JhbmdlJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlclVwZGF0ZVN0YXR1c31gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmVlbicpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnb3JhbmdlJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJEaXNjb25uZWN0ZWQpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHdpbmRvd1tjbGFzc05hbWVdLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=