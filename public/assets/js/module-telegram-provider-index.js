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
  saveTableAJAXUrl: globalRootUrl + idUrl + "/saveTableData",
  deleteRecordAJAXUrl: globalRootUrl + idUrl + "/delete",
  $disabilityFields: $('#' + idForm + '  .disability'),
  $statusToggle: $('#module-status-toggle'),
  $moduleStatus: $('#status'),
  authProcess: '',
  waitingInput: false,
  statusesTimer: null,

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
    $.get(idUrl + '/getTablesDescription', function (result) {
      for (var key in result['data']) {
        var tableName = key + '-table';

        if ($('#' + tableName).attr('id') === undefined) {
          continue;
        }

        window[className].initTable(tableName, result['data'][key]);
      }
    });
    window[className].checkStatusToggle();
  },
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

      window[className].checkStatus(id);
    });
  },

  /**
   * Запрос статуса авторизации.
   * @param id
   */
  checkStatus: function checkStatus(id) {
    if (window[className].authProcess === '') {
      return;
    }

    var elDimmer = $('#dimmer-wait-status');
    elDimmer.addClass('active');
    $.get('/pbxcore/api/modules/' + className + '/status?id=' + id, function (response) {
      console.debug(response);

      if (window[className].waitingInput === true) {
        // Зупущено модальное окно ожидания ввода кода доступа.
        return;
      }

      if (response.result === false) {
        setTimeout(window[className].checkStatus, 5000, id);
        return;
      }

      var allEnd = true;
      $.each(response.data, function (authProcess, statusData) {
        if (statusData.status === 'Done') {//
        } else if (statusData.status === 'WaitInput' && statusData.data.trim() === '') {
          allEnd = false;
          var translateStatus = globalTranslate[statusData.output];

          if (translateStatus === undefined) {
            translateStatus = statusData.output;
          }

          $('#command-dialog form div.field label').text(translateStatus);
          $('input[id=command]').val('');
          var phone = $('#ModuleTelegramProvider-table tr[id=' + id + '] input[colname="phone_number"]').val();
          var title = globalTranslate["module_telegram_provider_" + window[className].authProcess] + " (".concat(phone, ")");
          $('#command-dialog a.ui.ribbon.label').text(title);
          window[className].waitingInput = true;
          $('#command-dialog').modal({
            closable: false,
            onDeny: function onDeny() {
              $.get('/pbxcore/api/modules/' + className + '/cancel-auth?id=' + id);
              window[className].waitingInput = false;
            },
            onApprove: function onApprove() {
              var elCommand = $('#command');
              var command = elCommand.val();
              elCommand.val('');
              $.get('/pbxcore/api/modules/' + className + '/enter-command?id=' + id + '&command=' + command + '&key=' + authProcess, function (responseCmd) {
                if (responseCmd.result === true) {
                  setTimeout(window[className].checkStatus, 3000, id);
                }
              });
              window[className].waitingInput = false;
            }
          }).modal('show');
        } else if (statusData.status === 'Error') {
          $("#error-message").show();
          $("#error-message .header").text(globalTranslate.module_telegram_providerError);
          $("#error-message .body").text(statusData.output);
        } else {
          allEnd = false;
          setTimeout(window[className].checkStatus, 2000, id);
        }
      });

      if (allEnd === true) {
        window[className].authProcess = '';
        elDimmer.removeClass('active');
        window[className].statusesTimer = null; // Возобновляем проверку статусов линий.

        window[className].checkStatusToggle();
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
        url: idUrl + options.ajaxUrl + '?table=' + tableName.replace('-table', ''),
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
        window[className].statusesTimer = setTimeout(window[className].checkStatuses, 10000);
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
//# sourceMappingURL=module-telegram-provider-index.js.map