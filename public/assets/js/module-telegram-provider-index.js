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

    var onResponse = function onResponse(response) {
      if (response.result === false) {
        console.log(response);
        $("#error-message").show();
        $("#error-message .header").text(globalTranslate.module_telegram_providerError);
        $("#error-message .body").text('');
        return;
      }
    };

    $.get('/pbxcore/api/modules/' + className + '/start-auth?id=' + id + '&type=' + window[className].authProcess, onResponse) // Core#1166: newer cores send a failed start-auth as HTTP 4xx with the same JSON body.
    .fail(function (xhr) {
      return onResponse(xhr.responseJSON || {
        result: false
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUtdGVsZWdyYW0tcHJvdmlkZXItaW5kZXguanMiXSwibmFtZXMiOlsiaWRVcmwiLCJpZEZvcm0iLCJjbGFzc05hbWUiLCJpbnB1dENsYXNzTmFtZSIsIk1vZHVsZVRlbGVncmFtUHJvdmlkZXIiLCIkZm9ybU9iaiIsIiQiLCIkY2hlY2tCb3hlcyIsIiRkcm9wRG93bnMiLCJzYXZlVGFibGVBSkFYVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJnbG9iYWxSb290VXJsIiwiZGVsZXRlUmVjb3JkQUpBWFVybCIsIiRkaXNhYmlsaXR5RmllbGRzIiwiJHN0YXR1c1RvZ2dsZSIsIiRtb2R1bGVTdGF0dXMiLCJhdXRoUHJvY2VzcyIsInN0YXR1c2VzVGltZXIiLCJldmVudFNvdXJjZSIsInZhbGlkYXRlUnVsZXMiLCJ0ZXh0RmllbGQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibW9kX3RwbFZhbGlkYXRlVmFsdWVJc0VtcHR5IiwiYXJlYUZpZWxkIiwicGFzc3dvcmRGaWVsZCIsImluaXRpYWxpemUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwiYWRkRXZlbnRMaXN0ZW5lciIsImNoZWNrU3RhdHVzVG9nZ2xlIiwiaW5pdGlhbGl6ZUZvcm0iLCJ0YWIiLCJlbCIsInNob3ciLCJoaWRlIiwiZ2V0IiwicmVzdWx0Iiwia2V5IiwidGFibGVOYW1lIiwiYXR0ciIsInVuZGVmaW5lZCIsImluaXRUYWJsZSIsImluaXRFdmVudFNvdXJjZSIsImNoYW4iLCJ1cmwiLCJ2YWwiLCJFdmVudFNvdXJjZSIsIndpdGhDcmVkZW50aWFscyIsIm9ubWVzc2FnZSIsIm9uUGJ4TWVzc2FnZSIsImV2ZW50Iiwic3RhdHVzRGF0YSIsInBhcnNlSlNPTiIsImRhdGEiLCJlIiwiZWxEaW1tZXIiLCJzdGF0dXMiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwidHJpbSIsInRyYW5zbGF0ZVN0YXR1cyIsIm91dHB1dCIsInRleHQiLCJ0aXRsZSIsImFwcCIsInBob25lIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImVsQ29tbWFuZCIsImNvbW1hbmQiLCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJFcnJvciIsImNoZWNrU3RhdHVzZXMiLCJyZXNwb25zZSIsImhhdmVEaXNhYmxlIiwiaWQiLCJ1cmlCdXR0b24iLCJlbGVtZW50cyIsImtleUVsZW1lbnQiLCJlbEJ1dHRvbiIsImNoYW5nZVN0YXR1cyIsInNldFRpbWVvdXQiLCJzdGFydEF1dGgiLCJmYWlsQXV0aCIsImNsZWFyVGltZW91dCIsIm9uUmVzcG9uc2UiLCJjb25zb2xlIiwibG9nIiwiZmFpbCIsInhociIsInJlc3BvbnNlSlNPTiIsIm1ha2VEcm9wZG93bkxpc3QiLCJzZWxlY3RUeXBlIiwic2VsZWN0ZWQiLCJ2YWx1ZXMiLCJuYW1lIiwidmFsdWUiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJwdXNoIiwiY2hhbmdlR3JvdXBJbkxpc3QiLCJjaG9pY2UiLCJ0ZElucHV0IiwiY2xvc2VzdCIsImZpbmQiLCJjdXJyZW50Um93SWQiLCJyZXBsYWNlIiwic2VuZENoYW5nZXNUb1NlcnZlciIsIm9wdGlvbnMiLCJjb2x1bW5zIiwiY29sdW1uc0FycmF5NFNvcnQiLCJjb2xOYW1lIiwiRGF0YVRhYmxlIiwiYWpheCIsImFqYXhVcmwiLCJkYXRhU3JjIiwicGFnaW5nIiwic0RvbSIsImRlZmVyUmVuZGVyIiwicGFnZUxlbmd0aCIsImluZm9DYWxsYmFjayIsInNldHRpbmdzIiwic3RhcnQiLCJlbmQiLCJtYXgiLCJ0b3RhbCIsInByZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJvcmRlcmluZyIsImNyZWF0ZWRSb3ciLCJyb3ciLCJjb2xzIiwiaGVhZGVycyIsImluZGV4T2YiLCJlcSIsImh0bWwiLCJ1cmkiLCJEVF9Sb3dJZCIsInRlbXBsYXRlRGVsZXRlQnV0dG9uIiwibW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyQ29weSIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlcl9hY3Rpb25fcmVtb3ZlIiwiYnRfVG9vbFRpcERlbGV0ZSIsInRlbXBsYXRlIiwiYWRkaXRpb25hbENsYXNzIiwiaGVhZGVyIiwic2VsZWN0TWV0YURhdGEiLCJuZXdUZW1wbGF0ZSIsImRyYXdDYWxsYmFjayIsImRyb3dTZWxlY3RHcm91cCIsInNUYWJsZUlkIiwiYm9keSIsIm9uIiwidGFyZ2V0IiwidHJhbnNpdGlvbiIsImRvY3VtZW50Iiwia2V5Q29kZSIsIndoaWNoIiwiaGFzQ2xhc3MiLCJlbmRFZGl0SW5wdXQiLCJwcmV2ZW50RGVmYXVsdCIsImVsVGFibGVOYW1lIiwiZGVsZXRlUm93IiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJlcnJvciIsImFjdGlvbiIsInRyaWdnZXIiLCJhZGROZXdSb3ciLCJjYk9uRHJvcCIsInRhYmxlIiwicHJpb3JpdHlXYXNDaGFuZ2VkIiwicHJpb3JpdHlEYXRhIiwicnVsZUlkIiwib2xkUHJpb3JpdHkiLCJwYXJzZUludCIsIm5ld1ByaW9yaXR5Iiwicm93SW5kZXgiLCJpc05hTiIsImFwaSIsIm1ldGhvZCIsIiRlbCIsImlkVGFibGUiLCJyZW1vdmUiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJyb3dUZW1wbGF0ZSIsImJlZm9yZSIsInRhYmxlSWQiLCJzZWxlc3RHcm91cCIsIm9uQ2hhbmdlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJzdWJzdHIiLCJvblN1Y2Nlc3MiLCJsZW5ndGgiLCJzdWNjZXNzIiwiYXBwZW5kIiwicmVjb3JkSWQiLCJub3RFbXB0eSIsInNhdmluZ1Jvd1RhYmxlIiwic3VjY2Vzc1Rlc3QiLCJPYmplY3QiLCJrZXlzIiwicm93SWQiLCJvbkZhaWx1cmUiLCJtZXNzYWdlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJvbkVycm9yIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInN0ZXAzIiwiYXBwbHlDb25maWd1cmF0aW9uQ2hhbmdlcyIsIkNvbmZpZyIsInBieFVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlck5vdEFsbENvbm5lY3RlZCIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckNvbm5lY3RlZCIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckRpc2Nvbm5lY3RlZCIsIm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlclVwZGF0ZVN0YXR1cyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsS0FBSyxHQUFPLDBCQUFsQjtBQUNBLElBQU1DLE1BQU0sR0FBTSwrQkFBbEI7QUFDQSxJQUFNQyxTQUFTLEdBQUcsd0JBQWxCO0FBQ0EsSUFBTUMsY0FBYyxHQUFHLHNCQUF2QjtBQUVBOztBQUNBLElBQU1DLHNCQUFzQixHQUFHO0FBQzlCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxNQUFJTCxNQUFMLENBRG1CO0FBRTlCTSxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQyxNQUFJTCxNQUFKLEdBQVcsZUFBWixDQUZnQjtBQUc5Qk8sRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMsTUFBSUwsTUFBSixHQUFXLGVBQVosQ0FIaUI7QUFJOUJRLEVBQUFBLGdCQUFnQixFQUFFQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCLEdBQXVCQyxhQUF2QixHQUF1Q2IsS0FBdkMsR0FBK0MsZ0JBSm5DO0FBSzlCYyxFQUFBQSxtQkFBbUIsRUFBRUosTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFoQixHQUF1QkMsYUFBdkIsR0FBdUNiLEtBQXZDLEdBQStDLFNBTHRDO0FBTTlCZSxFQUFBQSxpQkFBaUIsRUFBRVQsQ0FBQyxDQUFDLE1BQUlMLE1BQUosR0FBVyxlQUFaLENBTlU7QUFPOUJl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Q0FBQytNLG9DQUFyRDtBQUNBOztBQUNELFdBQUssVUFBTDtBQUNDaE8sUUFBQUEsTUFBTSxDQUFDUixTQUFELENBQU4sQ0FBa0JlLGFBQWxCLENBQ0UrQyxXQURGLENBQ2MsT0FEZCxFQUVFQSxXQUZGLENBRWMsS0FGZCxFQUdFQSxXQUhGLENBR2MsUUFIZCxFQUlFRCxRQUpGLENBSVcsTUFKWDtBQUtBckQsUUFBQUEsTUFBTSxDQUFDUixTQUFELENBQU4sQ0FBa0JlLGFBQWxCLENBQWdDZ0ksSUFBaEMsaURBQTRFdEgsZUFBZSxDQUFDZ04sb0NBQTVGO0FBQ0E7O0FBQ0Q7QUFDQ2pPLFFBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCZSxhQUFsQixDQUNFK0MsV0FERixDQUNjLE9BRGQsRUFFRUEsV0FGRixDQUVjLEtBRmQsRUFHRUEsV0FIRixDQUdjLFFBSGQsRUFJRUQsUUFKRixDQUlXLE1BSlg7QUFLQXJELFFBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCZSxhQUFsQixDQUFnQ2dJLElBQWhDLENBQXFDdEgsZUFBZSxDQUFDK00sb0NBQXJEO0FBQ0E7QUF4Q0Y7QUEwQ0E7QUEzcUI2QixDQUEvQjtBQThxQkFwTyxDQUFDLENBQUM4SixRQUFELENBQUQsQ0FBWXdFLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmxPLEVBQUFBLE1BQU0sQ0FBQ1IsU0FBRCxDQUFOLENBQWtCNkIsVUFBbEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMSAyMDE4XG4gKlxuICovXG5jb25zdCBpZFVybCAgICAgPSAnbW9kdWxlLXRlbGVncmFtLXByb3ZpZGVyJztcbmNvbnN0IGlkRm9ybSAgICA9ICdtb2R1bGUtdGVsZWdyYW0tcHJvdmlkZXItZm9ybSc7XG5jb25zdCBjbGFzc05hbWUgPSAnTW9kdWxlVGVsZWdyYW1Qcm92aWRlcic7XG5jb25zdCBpbnB1dENsYXNzTmFtZSA9ICdtaWtvcGJ4LW1vZHVsZS1pbnB1dCc7XG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIENvbmZpZywgJCAqL1xuY29uc3QgTW9kdWxlVGVsZWdyYW1Qcm92aWRlciA9IHtcblx0JGZvcm1PYmo6ICQoJyMnK2lkRm9ybSksXG5cdCRjaGVja0JveGVzOiAkKCcjJytpZEZvcm0rJyAudWkuY2hlY2tib3gnKSxcblx0JGRyb3BEb3duczogJCgnIycraWRGb3JtKycgLnVpLmRyb3Bkb3duJyksXG5cdHNhdmVUYWJsZUFKQVhVcmw6IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4rZ2xvYmFsUm9vdFVybCArIGlkVXJsICsgXCIvc2F2ZVRhYmxlRGF0YVwiLFxuXHRkZWxldGVSZWNvcmRBSkFYVXJsOiB3aW5kb3cubG9jYXRpb24ub3JpZ2luK2dsb2JhbFJvb3RVcmwgKyBpZFVybCArIFwiL2RlbGV0ZVwiLFxuXHQkZGlzYWJpbGl0eUZpZWxkczogJCgnIycraWRGb3JtKycgIC5kaXNhYmlsaXR5JyksXG5cdCRzdGF0dXNUb2dnbGU6ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLFxuXHQkbW9kdWxlU3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cdGF1dGhQcm9jZXNzOiAnJyxcblx0c3RhdHVzZXNUaW1lcjogbnVsbCxcblx0ZXZlbnRTb3VyY2U6IHt9LFxuXHQvKipcblx0ICogRmllbGQgdmFsaWRhdGlvbiBydWxlc1xuXHQgKiBodHRwczovL3NlbWFudGljLXVpLmNvbS9iZWhhdmlvcnMvZm9ybS5odG1sXG5cdCAqL1xuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0dGV4dEZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndGV4dF9maWVsZCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tb2RfdHBsVmFsaWRhdGVWYWx1ZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0YXJlYUZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndGV4dF9hcmVhX2ZpZWxkJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1vZF90cGxWYWxpZGF0ZVZhbHVlSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwYXNzd29yZEZpZWxkOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGFzc3dvcmRfZmllbGQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubW9kX3RwbFZhbGlkYXRlVmFsdWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHQvKipcblx0ICogT24gcGFnZSBsb2FkIHdlIGluaXQgc29tZSBTZW1hbnRpYyBVSSBsaWJyYXJ5XG5cdCAqL1xuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINC40L3QuNGG0LjQsNC70LjQt9C40YDRg9C10Lwg0YfQtdC60LHQvtC60YHRiyDQuCDQstGL0L/QvtC00LDRjtGJ0LjQtSDQvNC10L3RjtGI0LrQuFxuXHRcdHdpbmRvd1tjbGFzc05hbWVdLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgd2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNUb2dnbGUpO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnLm1lbnUgLml0ZW0nKS50YWIoe1xuXHRcdFx0J29uVmlzaWJsZSc6ICh0YWIpID0+IHtcblx0XHRcdFx0bGV0IGVsID0gJChcIiNzdGVwM1wiKTtcblx0XHRcdFx0aWYodGFiID09PSAnZmlyc3QnKXtcblx0XHRcdFx0XHRlbC5zaG93KCk7XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGVsLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdCQuZ2V0KCBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9nZXRUYWJsZXNEZXNjcmlwdGlvbmAsIGZ1bmN0aW9uKCByZXN1bHQgKSB7XG5cdFx0XHRmb3IgKGxldCBrZXkgaW4gcmVzdWx0WydkYXRhJ10pIHtcblx0XHRcdFx0bGV0IHRhYmxlTmFtZSA9IGtleSArICctdGFibGUnO1xuXHRcdFx0XHRpZiggJCgnIycrdGFibGVOYW1lKS5hdHRyKCdpZCcpID09PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmluaXRUYWJsZSh0YWJsZU5hbWUsIHJlc3VsdFsnZGF0YSddW2tleV0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmNoZWNrU3RhdHVzVG9nZ2xlKCk7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uaW5pdEV2ZW50U291cmNlKCd0ZWxlZ3JhbS1wcm92aWRlcicpXG5cdH0sXG5cblx0aW5pdEV2ZW50U291cmNlOiBmdW5jdGlvbiAoY2hhbikge1xuXHRcdGxldCB1cmwgPSBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufS9wYnhjb3JlL2FwaS9uY2hhbi9zdWIvJHtjaGFufT90b2tlbj0keyQoJyNhcGlfaGFzaCcpLnZhbCgpfWA7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uZXZlbnRTb3VyY2VbY2hhbl0gPSBuZXcgRXZlbnRTb3VyY2UodXJsLCB7XG5cdFx0XHR3aXRoQ3JlZGVudGlhbHM6IHRydWVcblx0XHR9KTtcblx0XHR3aW5kb3dbY2xhc3NOYW1lXS5ldmVudFNvdXJjZVtjaGFuXS5vbm1lc3NhZ2UgPSB3aW5kb3dbY2xhc3NOYW1lXS5vblBieE1lc3NhZ2U7XG5cdFx0Ly8gd2luZG93W2NsYXNzTmFtZV0uZXZlbnRTb3VyY2VbY2hhbl0ub25lcnJvciAgID0gd2luZG93W2NsYXNzTmFtZV0ub25QYnhNZXNzYWdlRXJyb3I7XG5cdH0sXG5cdG9uUGJ4TWVzc2FnZTogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRsZXQgc3RhdHVzRGF0YTtcblx0XHR0cnl7XG5cdFx0XHRzdGF0dXNEYXRhID0gJC5wYXJzZUpTT04oZXZlbnQuZGF0YSk7XG5cdFx0fWNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxldCBlbERpbW1lciA9ICQoJyNkaW1tZXItd2FpdC1zdGF0dXMnKTtcblx0XHRpZihzdGF0dXNEYXRhLnN0YXR1cyA9PT0gJ0RvbmUnKXtcblx0XHRcdC8vXG5cdFx0fWVsc2UgaWYoc3RhdHVzRGF0YS5zdGF0dXMgPT09ICdTVEFSVF9BVVRIJyl7XG5cdFx0XHRlbERpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0fWVsc2UgaWYoc3RhdHVzRGF0YS5zdGF0dXMgPT09ICdFTkRfQVVUSCcpe1xuXHRcdFx0ZWxEaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdH1lbHNlIGlmKHN0YXR1c0RhdGEuc3RhdHVzID09PSAnV2FpdElucHV0JyAmJiBzdGF0dXNEYXRhLmRhdGEudHJpbSgpID09PSAnJyl7XG5cdFx0XHRsZXQgdHJhbnNsYXRlU3RhdHVzID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXR1c0RhdGEub3V0cHV0XTtcblx0XHRcdGlmKHRyYW5zbGF0ZVN0YXR1cyA9PT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0dHJhbnNsYXRlU3RhdHVzID0gc3RhdHVzRGF0YS5vdXRwdXQ7XG5cdFx0XHR9XG5cdFx0XHQkKCcjY29tbWFuZC1kaWFsb2cgZm9ybSBkaXYuZmllbGQgbGFiZWwnKS50ZXh0KHRyYW5zbGF0ZVN0YXR1cyk7XG5cdFx0XHQkKCdpbnB1dFtpZD1jb21tYW5kXScpLnZhbCgnJyk7XG5cdFx0XHRsZXQgdGl0bGUgPSBnbG9iYWxUcmFuc2xhdGVbXCJtb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJfXCIgKyBzdGF0dXNEYXRhLmFwcF0gKyBgICgke3N0YXR1c0RhdGEucGhvbmV9KWA7XG5cdFx0XHQkKCcjY29tbWFuZC1kaWFsb2cgYS51aS5yaWJib24ubGFiZWwnKS50ZXh0KHRpdGxlKTtcblx0XHRcdCQoJyNjb21tYW5kLWRpYWxvZycpXG5cdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0Y2xvc2FibGUgIDogZmFsc2UsXG5cdFx0XHRcdFx0b25EZW55ICAgIDogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdCQuZ2V0KCAnL3BieGNvcmUvYXBpL21vZHVsZXMvJytjbGFzc05hbWUrJy9jYW5jZWwtYXV0aD9sb2dpbj0nK3N0YXR1c0RhdGEucGhvbmUpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25BcHByb3ZlIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRsZXQgZWxDb21tYW5kID0gJCgnI2NvbW1hbmQnKTtcblx0XHRcdFx0XHRcdGxldCBjb21tYW5kID0gZWxDb21tYW5kLnZhbCgpO1xuXHRcdFx0XHRcdFx0ZWxDb21tYW5kLnZhbCgnJyk7XG5cdFx0XHRcdFx0XHQkLmdldCggJy9wYnhjb3JlL2FwaS9tb2R1bGVzLycrY2xhc3NOYW1lKycvZW50ZXItY29tbWFuZD9sb2dpbj0nK3N0YXR1c0RhdGEucGhvbmUrJyZjb21tYW5kPScrY29tbWFuZCsnJmtleT0nK3N0YXR1c0RhdGEuYXBwKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHR9ZWxzZSBpZihzdGF0dXNEYXRhLnN0YXR1cyA9PT0gJ0Vycm9yJyl7XG5cdFx0XHQkKFwiI2Vycm9yLW1lc3NhZ2VcIikuc2hvdygpO1xuXHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5oZWFkZXJcIikudGV4dChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyRXJyb3IpO1xuXHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5ib2R5XCIpLnRleHQoc3RhdHVzRGF0YS5vdXRwdXQpO1xuXHRcdH1cblx0fSxcblx0Lypcblx00J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQvtCyINC70LjQvdC40Llcblx0ICovXG5cdGNoZWNrU3RhdHVzZXMoKXtcbiAgICAgICAgJC5nZXQoICcvcGJ4Y29yZS9hcGkvbW9kdWxlcy8nK2NsYXNzTmFtZSsnL3N0YXR1c2VzJywgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0bGV0IGhhdmVEaXNhYmxlID0gZmFsc2U7XG5cdFx0XHRmb3IgKGxldCBpZCBpbiByZXNwb25zZS5kYXRhKSB7XG5cdFx0XHRcdGxldCB1cmlCdXR0b24gXHRcdD0gJCgnIycrY2xhc3NOYW1lKyctdGFibGUgdHJbaWQ9JytpZCsnXSBidXR0b24udWkuYnV0dG9uJyk7XG5cdFx0XHRcdGxldCBlbGVtZW50cyA9IHtcblx0XHRcdFx0XHQnZ3cnOiAkKCcjJytjbGFzc05hbWUrJy10YWJsZSB0cltpZD0nK2lkKyddIGFbZGF0YS1uYW1lPVwibG9naW4tZ3dcIl0gaScpLFxuXHRcdFx0XHRcdCd1c2VyJzogJCgnIycrY2xhc3NOYW1lKyctdGFibGUgdHJbaWQ9JytpZCsnXSBhW2RhdGEtbmFtZT1cImxvZ2luLXVzZXJcIl0gaScpLFxuXHRcdFx0XHRcdCdib3QnOiAkKCcjJytjbGFzc05hbWUrJy10YWJsZSB0cltpZD0nK2lkKyddIGFbZGF0YS1uYW1lPVwibG9naW4tYm90XCJdIGknKVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRmb3IgKGxldCBrZXlFbGVtZW50IGluIGVsZW1lbnRzKSB7XG5cdFx0XHRcdFx0bGV0IGVsQnV0dG9uICA9IGVsZW1lbnRzW2tleUVsZW1lbnRdO1xuXHRcdFx0XHRcdCQoJyMnK2NsYXNzTmFtZSsnLXRhYmxlIHRyW2lkPScraWQrJ10gYVtkYXRhLW5hbWU9XCJsb2dpbi0nK2tleUVsZW1lbnQrJ1wiXScpLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZVsnbW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyX3N0YXR1c18nK2tleUVsZW1lbnQrJ18nK3Jlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdIF0pO1xuXHRcdFx0XHRcdGlmKHJlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdID09PSAnT0snKSB7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5yZW1vdmVDbGFzcygncmVkIG9yYW5nZScpO1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24uYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0XHRcdFx0XHRpZiAoa2V5RWxlbWVudCA9PT0gJ2d3Jykge1xuXHRcdFx0XHRcdFx0XHR1cmlCdXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1lbHNlIGlmKHJlc3BvbnNlWydkYXRhJ11baWRdW2tleUVsZW1lbnRdID09PSAnV0FJVF9TVEFSVCcpe1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24ucmVtb3ZlQ2xhc3MoJ2dyZWVuIHJlZCcpO1xuXHRcdFx0XHRcdFx0ZWxCdXR0b24uYWRkQ2xhc3MoJ29yYW5nZScpO1xuXHRcdFx0XHRcdFx0aWYoa2V5RWxlbWVudD09PSdndycpe1xuXHRcdFx0XHRcdFx0XHRoYXZlRGlzYWJsZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdHVyaUJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5yZW1vdmVDbGFzcygnZ3JlZW4gb3JhbmdlJyk7XG5cdFx0XHRcdFx0XHRlbEJ1dHRvbi5hZGRDbGFzcygncmVkJyk7XG5cdFx0XHRcdFx0XHRpZihrZXlFbGVtZW50PT09J2d3Jyl7XG5cdFx0XHRcdFx0XHRcdGhhdmVEaXNhYmxlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0dXJpQnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cbiAgICAgICAgICAgIH1cblx0XHRcdGlmKGhhdmVEaXNhYmxlID09PSB0cnVlKXtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdOb3RBbGxDb25uZWN0ZWQnKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3RlZCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih3aW5kb3dbY2xhc3NOYW1lXS5zdGF0dXNlc1RpbWVyICE9PSAwKXtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9IG51bGw7XG5cdFx0XHRcdHNldFRpbWVvdXQod2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNUb2dnbGUsIDEwMDAwKTtcblx0XHRcdH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INC/0YDQvtGG0LXRgdGB0LAg0LDQstGC0L7RgNC40LfQsNGG0LjQuC5cblx0ICogQHBhcmFtIGlkXG5cdCAqIEBwYXJhbSBmYWlsQXV0aFxuXHQgKi9cblx0c3RhcnRBdXRoKGlkLCBmYWlsQXV0aCkge1xuXHRcdGlmKHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXIgIT09IG51bGwpe1xuXHRcdFx0Ly8g0J7RgdGC0LDQvdCw0LLQu9C40LLQsNC10Lwg0L/RgNC+0LLQtdGA0LrRgyDRgdGC0LDRgtGD0YHQvtCyLlxuXHRcdFx0Y2xlYXJUaW1lb3V0KHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXIpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9IDA7XG5cdFx0fVxuXHRcdCQoXCIjZXJyb3ItbWVzc2FnZVwiKS5oaWRlKCk7XG5cdFx0Y29uc3Qgb25SZXNwb25zZSA9IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmKHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZyhyZXNwb25zZSk7XG5cdFx0XHRcdCQoXCIjZXJyb3ItbWVzc2FnZVwiKS5zaG93KCk7XG5cdFx0XHRcdCQoXCIjZXJyb3ItbWVzc2FnZSAuaGVhZGVyXCIpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckVycm9yKTtcblx0XHRcdFx0JChcIiNlcnJvci1tZXNzYWdlIC5ib2R5XCIpLnRleHQoJycpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fTtcblx0XHQkLmdldCggJy9wYnhjb3JlL2FwaS9tb2R1bGVzLycrY2xhc3NOYW1lKycvc3RhcnQtYXV0aD9pZD0nK2lkKycmdHlwZT0nK3dpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzLCBvblJlc3BvbnNlKVxuXHRcdFx0Ly8gQ29yZSMxMTY2OiBuZXdlciBjb3JlcyBzZW5kIGEgZmFpbGVkIHN0YXJ0LWF1dGggYXMgSFRUUCA0eHggd2l0aCB0aGUgc2FtZSBKU09OIGJvZHkuXG5cdFx0XHQuZmFpbCgoeGhyKSA9PiBvblJlc3BvbnNlKHhoci5yZXNwb25zZUpTT04gfHwgeyByZXN1bHQ6IGZhbHNlIH0pKTtcblx0fSxcblxuXHQvKipcblx0ICpcblx0ICogQHBhcmFtIHNlbGVjdFR5cGVcblx0ICogQHBhcmFtIHNlbGVjdGVkXG5cdCAqIEByZXR1cm5zIHtbe25hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZywgc2VsZWN0ZWQ6IGJvb2xlYW59XX1cblx0ICovXG5cdG1ha2VEcm9wZG93bkxpc3Qoc2VsZWN0VHlwZSwgc2VsZWN0ZWQpIHtcblx0XHRjb25zdCB2YWx1ZXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6ICcgLS0tICcsXG5cdFx0XHRcdHZhbHVlOiAnJyxcblx0XHRcdFx0c2VsZWN0ZWQ6ICgnJyA9PT0gc2VsZWN0ZWQpLFxuXHRcdFx0fVxuXHRcdF07XG5cdFx0JCgnIycrc2VsZWN0VHlwZSsnIG9wdGlvbicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdHZhbHVlcy5wdXNoKHtcblx0XHRcdFx0bmFtZTogb2JqLnRleHQsXG5cdFx0XHRcdHZhbHVlOiBvYmoudmFsdWUsXG5cdFx0XHRcdHNlbGVjdGVkOiAoc2VsZWN0ZWQgPT09IG9iai52YWx1ZSksXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gdmFsdWVzO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINC40LfQvNC10L3QtdC90LjRjyDQs9GA0YPQv9C/0Ysg0LIg0YHQv9C40YHQutC1XG5cdCAqL1xuXHRjaGFuZ2VHcm91cEluTGlzdCh2YWx1ZSwgdGV4dCwgY2hvaWNlKSB7XG5cdFx0bGV0IHRkSW5wdXQgPSAkKGNob2ljZSkuY2xvc2VzdCgndGQnKS5maW5kKCdpbnB1dCcpO1xuXHRcdHRkSW5wdXQuYXR0cignZGF0YS12YWx1ZScsIFx0dmFsdWUpO1xuXHRcdHRkSW5wdXQuYXR0cigndmFsdWUnLCBcdFx0dmFsdWUpO1xuXHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGNob2ljZSkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdGxldCB0YWJsZU5hbWUgICAgPSAkKGNob2ljZSkuY2xvc2VzdCgndGFibGUnKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy10YWJsZScsICcnKTtcblx0XHRpZiAoY3VycmVudFJvd0lkICE9PSB1bmRlZmluZWQgJiYgdGFibGVOYW1lICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIodGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWRkIG5ldyBUYWJsZS5cblx0ICovXG5cdGluaXRUYWJsZSh0YWJsZU5hbWUsIG9wdGlvbnMpIHtcblx0XHRsZXQgY29sdW1ucyA9IFtdO1xuXHRcdGxldCBjb2x1bW5zQXJyYXk0U29ydCA9IFtdXG5cdFx0Zm9yIChsZXQgY29sTmFtZSBpbiBvcHRpb25zWydjb2xzJ10pIHtcblx0XHRcdGNvbHVtbnMucHVzaCgge2RhdGE6IGNvbE5hbWV9KTtcblx0XHRcdGNvbHVtbnNBcnJheTRTb3J0LnB1c2goY29sTmFtZSk7XG5cdFx0fVxuXHRcdCQoJyMnICsgdGFibGVOYW1lKS5EYXRhVGFibGUoIHtcblx0XHRcdGFqYXg6IHtcblx0XHRcdFx0dXJsOiBgJHt3aW5kb3cubG9jYXRpb24ub3JpZ2lufSR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfSR7b3B0aW9ucy5hamF4VXJsfT90YWJsZT1gK3RhYmxlTmFtZS5yZXBsYWNlKCctdGFibGUnLCAnJyksXG5cdFx0XHRcdGRhdGFTcmM6ICdkYXRhJ1xuXHRcdFx0fSxcblx0XHRcdGNvbHVtbnM6IGNvbHVtbnMsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0c0RvbTogJ3J0aXAnLFxuXHRcdFx0ZGVmZXJSZW5kZXI6IHRydWUsXG5cdFx0XHRwYWdlTGVuZ3RoOiAxNyxcblx0XHRcdGluZm9DYWxsYmFjayggc2V0dGluZ3MsIHN0YXJ0LCBlbmQsIG1heCwgdG90YWwsIHByZSApIHtcblx0XHRcdFx0cmV0dXJuICcnO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0XHRvcmRlcmluZzogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEJ1aWxkZXIgcm93IHByZXNlbnRhdGlvblxuXHRcdFx0ICogQHBhcmFtIHJvd1xuXHRcdFx0ICogQHBhcmFtIGRhdGFcblx0XHRcdCAqL1xuXHRcdFx0Y3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcblx0XHRcdFx0bGV0IGNvbHMgICAgPSAkKCd0ZCcsIHJvdyk7XG5cdFx0XHRcdGxldCBoZWFkZXJzID0gJCgnIycrIHRhYmxlTmFtZSArICcgdGhlYWQgdHIgdGgnKTtcblx0XHRcdFx0Zm9yIChsZXQga2V5IGluIGRhdGEpIHtcblx0XHRcdFx0XHRsZXQgaW5kZXggPSBjb2x1bW5zQXJyYXk0U29ydC5pbmRleE9mKGtleSk7XG5cdFx0XHRcdFx0aWYoa2V5ID09PSAncm93SWNvbicpe1xuXHRcdFx0XHRcdFx0Y29scy5lcShpbmRleCkuaHRtbCgnPGkgY2xhc3M9XCJ1aSAnICsgZGF0YVtrZXldICsgJyBjaXJjbGUgaWNvblwiPjwvaT4nKTtcblx0XHRcdFx0XHR9ZWxzZSBpZihrZXkgPT09ICdkZWxCdXR0b24nKXtcblx0XHRcdFx0XHRcdGxldCB1cmkgPSAnMTI3LjAuMC4xOicrKDMwMDAwKzEqZGF0YS5EVF9Sb3dJZCk7XG5cdFx0XHRcdFx0XHRsZXQgdGVtcGxhdGVEZWxldGVCdXR0b24gPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPicgK1xuXHRcdFx0XHRcdFx0XHQnPGJ1dHRvbiBkYXRhLW5hbWU9XCJ1cmktYnV0dG9uXCIgY2xhc3M9XCJ1aSBidXR0b24gY2xpcGJvYXJkIGRpc2FiaWxpdHlcIiBkYXRhLXRvb2x0aXA9XCInK2dsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJDb3B5KydcIiAgZGF0YS1wb3NpdGlvbj1cImxlZnQgY2VudGVyXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIicrdXJpKydcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+c2lwOicrdXJpKyc8L2J1dHRvbj4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwibG9naW4tZ3dcIiAgaHJlZj1cIlwiIGNsYXNzPVwidWkgYnV0dG9uIHBvcHVwZWRcIj48aSBjbGFzcz1cImljb24gdGVsZWdyYW1cIj48L2k+PC9hPicrXG5cdFx0XHRcdFx0XHRcdCc8YSBkYXRhLW5hbWU9XCJsb2dpbi11c2VyXCIgIGhyZWY9XCJcIiBjbGFzcz1cInVpIGJ1dHRvbiBwb3B1cGVkXCI+PGkgY2xhc3M9XCJpY29uIGVudmVsb3BlXCI+PC9pPjwvYT4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwibG9naW4tYm90XCIgIGhyZWY9XCJcIiBjbGFzcz1cInVpIGJ1dHRvbiBwb3B1cGVkXCI+PGkgY2xhc3M9XCJpY29uIGFuZHJvaWQgc2VjcmV0XCI+PC9pPjwvYT4nK1xuXHRcdFx0XHRcdFx0XHQnPGEgZGF0YS1uYW1lPVwiZGVsZXRlLWJ1dHRvblwiIGhyZWY9XCInICsgd2luZG93W2NsYXNzTmFtZV0uZGVsZXRlUmVjb3JkQUpBWFVybCArICcvJyArXG5cdFx0XHRcdFx0XHRcdGRhdGEuRFRfUm93SWQgKyAnXCIgZGF0YS12YWx1ZSA9IFwiJyArIGRhdGEuRFRfUm93SWQgKyAnXCInICtcblx0XHRcdFx0XHRcdFx0JyBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgZGF0YS10b29sdGlwPVwiJytnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyX2FjdGlvbl9yZW1vdmUrJ1wiIGRhdGEtY29udGVudD1cIicgKyBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSArICdcIj4nICtcblx0XHRcdFx0XHRcdFx0JzxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPjwvZGl2Pic7XG5cdFx0XHRcdFx0XHRjb2xzLmVxKGluZGV4KS5odG1sKHRlbXBsYXRlRGVsZXRlQnV0dG9uKTtcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmFkZENsYXNzKCdyaWdodCBhbGlnbmVkJyk7XG5cdFx0XHRcdFx0fWVsc2UgaWYoa2V5ID09PSAncHJpb3JpdHknKXtcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmFkZENsYXNzKCdkcmFnSGFuZGxlJylcblx0XHRcdFx0XHRcdGNvbHMuZXEoaW5kZXgpLmh0bWwoJzxpIGNsYXNzPVwidWkgc29ydCBjaXJjbGUgaWNvblwiPjwvaT4nKTtcblx0XHRcdFx0XHRcdC8vINCf0YDQuNC+0YDQuNGC0LXRgiDRg9GB0YLQsNC90LDQstC70LjQstCw0LXQvCDQtNC70Y8g0YHRgtGA0L7QutC4LlxuXHRcdFx0XHRcdFx0JChyb3cpLmF0dHIoJ20tcHJpb3JpdHknLCBkYXRhW2tleV0pO1xuXHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0bGV0IHRlbXBsYXRlID0gJzxkaXYgY2xhc3M9XCJ1aSB0cmFuc3BhcmVudCBmbHVpZCBpbnB1dCBpbmxpbmUtZWRpdFwiPicgK1xuXHRcdFx0XHRcdFx0XHQnPGlucHV0IGNvbE5hbWU9XCInK2tleSsnXCIgY2xhc3M9XCInK2lucHV0Q2xhc3NOYW1lKydcIiB0eXBlPVwidGV4dFwiIGRhdGEtdmFsdWU9XCInK2RhdGFba2V5XSArICdcIiB2YWx1ZT1cIicgKyBkYXRhW2tleV0gKyAnXCI+PC9kaXY+Jztcblx0XHRcdFx0XHRcdCQoJ3RkJywgcm93KS5lcShpbmRleCkuaHRtbCh0ZW1wbGF0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKG9wdGlvbnNbJ2NvbHMnXVtrZXldID09PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBhZGRpdGlvbmFsQ2xhc3MgPSBvcHRpb25zWydjb2xzJ11ba2V5XVsnY2xhc3MnXTtcblx0XHRcdFx0XHRpZihhZGRpdGlvbmFsQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBhZGRpdGlvbmFsQ2xhc3MgIT09ICcnKXtcblx0XHRcdFx0XHRcdGhlYWRlcnMuZXEoaW5kZXgpLmFkZENsYXNzKGFkZGl0aW9uYWxDbGFzcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCBoZWFkZXIgPSBvcHRpb25zWydjb2xzJ11ba2V5XVsnaGVhZGVyJ107XG5cdFx0XHRcdFx0aWYoaGVhZGVyICE9PSB1bmRlZmluZWQgJiYgaGVhZGVyICE9PSAnJyl7XG5cdFx0XHRcdFx0XHRoZWFkZXJzLmVxKGluZGV4KS5odG1sKGhlYWRlcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bGV0IHNlbGVjdE1ldGFEYXRhID0gb3B0aW9uc1snY29scyddW2tleV1bJ3NlbGVjdCddO1xuXHRcdFx0XHRcdGlmKHNlbGVjdE1ldGFEYXRhICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0bGV0IG5ld1RlbXBsYXRlID0gJCgnI3RlbXBsYXRlLXNlbGVjdCcpLmh0bWwoKS5yZXBsYWNlKCdQQVJBTScsIGRhdGFba2V5XSk7XG5cdFx0XHRcdFx0XHRsZXQgdGVtcGxhdGUgPSAnPGlucHV0IGNsYXNzPVwiJytpbnB1dENsYXNzTmFtZSsnXCIgY29sTmFtZT1cIicra2V5KydcIiBzZWxlY3RUeXBlPVwiJytzZWxlY3RNZXRhRGF0YSsnXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiIHR5cGU9XCJ0ZXh0XCIgZGF0YS12YWx1ZT1cIicrZGF0YVtrZXldICsgJ1wiIHZhbHVlPVwiJyArIGRhdGFba2V5XSArICdcIj48L2Rpdj4nO1xuXHRcdFx0XHRcdFx0Y29scy5lcShpbmRleCkuaHRtbChuZXdUZW1wbGF0ZSArIHRlbXBsYXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIERyYXcgZXZlbnQgLSBmaXJlZCBvbmNlIHRoZSB0YWJsZSBoYXMgY29tcGxldGVkIGEgZHJhdy5cblx0XHRcdCAqL1xuXHRcdFx0ZHJhd0NhbGxiYWNrKHNldHRpbmdzKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmRyb3dTZWxlY3RHcm91cChzZXR0aW5ncy5zVGFibGVJZCk7XG5cdFx0XHR9LFxuXHRcdH0gKTtcblxuXHRcdGxldCBib2R5ID0gJCgnYm9keScpO1xuXHRcdC8vINCa0LvQuNC6INC/0L4g0L/QvtC70Y4uINCS0YXQvtC0INC00LvRjyDRgNC10LTQsNC60YLQuNGA0L7QstCw0L3QuNGPINC30L3QsNGH0LXQvdC40Y8uXG5cdFx0Ym9keS5vbignZm9jdXNpbicsICcuJytpbnB1dENsYXNzTmFtZSwgZnVuY3Rpb24gKGUpIHtcblx0XHRcdCQoZS50YXJnZXQpLnRyYW5zaXRpb24oJ2dsb3cnKTtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2RpdicpLnJlbW92ZUNsYXNzKCd0cmFuc3BhcmVudCcpLmFkZENsYXNzKCdjaGFuZ2VkLWZpZWxkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5hdHRyKCdyZWFkb25seScsIGZhbHNlKTtcblx0XHR9KVxuXHRcdC8vINCe0YLQv9GA0LDQstC60LAg0YTQvtGA0LzRiyDQvdCwINGB0LXRgNCy0LXRgCDQv9C+IEVudGVyINC40LvQuCBUYWJcblx0XHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRsZXQga2V5Q29kZSA9IGUua2V5Q29kZSB8fCBlLndoaWNoO1xuXHRcdFx0aWYgKGtleUNvZGUgPT09IDEzIHx8IGtleUNvZGUgPT09IDkgJiYgJCgnOmZvY3VzJykuaGFzQ2xhc3MoJ21pa29wYngtbW9kdWxlLWlucHV0JykpIHtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uZW5kRWRpdElucHV0KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRib2R5Lm9uKCdjbGljaycsICdhW2RhdGEtbmFtZT1cImxvZ2luLWd3XCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ2d3Jztcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5zdGFydEF1dGgoY3VycmVudFJvd0lkKTtcblx0XHR9KTtcdFx0XG5cdFx0Ym9keS5vbignY2xpY2snLCAnYVtkYXRhLW5hbWU9XCJsb2dpbi11c2VyXCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ3VzZXInO1xuXHRcdFx0bGV0IGN1cnJlbnRSb3dJZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnN0YXJ0QXV0aChjdXJyZW50Um93SWQpO1xuXHRcdH0pO1xuXHRcdGJvZHkub24oJ2NsaWNrJywgJ2FbZGF0YS1uYW1lPVwibG9naW4tYm90XCJdJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLmF1dGhQcm9jZXNzID0gJ2JvdCc7XG5cdFx0XHRsZXQgY3VycmVudFJvd0lkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uc3RhcnRBdXRoKGN1cnJlbnRSb3dJZCk7XG5cdFx0fSk7XG5cdFx0Ym9keS5vbignY2xpY2snLCAnYnV0dG9uW2RhdGEtbmFtZT1cInVyaS1idXR0b25cIl0nLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0pO1xuXHRcdGJvZHkub24oJ2NsaWNrJywgJ2EuZGVsZXRlJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHRsZXQgZWxUYWJsZU5hbWUgICAgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0YWJsZScpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uZGVsZXRlUm93KGVsVGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdH0pOyAvLyDQlNC+0LHQsNCy0LvQtdC90LjQtSDQvdC+0LLQvtC5INGB0YLRgNC+0LrQuFxuXG5cdFx0bGV0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuXHRcdGNsaXBib2FyZC5vbignZXJyb3InLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcblx0XHR9KTtcblx0XHQvLyDQntGC0L/RgNCw0LLQutCwINGE0L7RgNC80Ysg0L3QsCDRgdC10YDQstC10YAg0L/QviDRg9GF0L7QtNGDINGBINC/0L7Qu9GPINCy0LLQvtC00LBcblx0XHRib2R5Lm9uKCdmb2N1c291dCcsICcuJytpbnB1dENsYXNzTmFtZSwgd2luZG93W2NsYXNzTmFtZV0uZW5kRWRpdElucHV0KTtcblxuXHRcdC8vINCa0L3QvtC/0LrQsCBcItCU0L7QsdCw0LLQuNGC0Ywg0L3QvtCy0YPRjiDQt9Cw0L/QuNGB0YxcIlxuXHRcdCQoJ1tpZC10YWJsZSA9IFwiJyt0YWJsZU5hbWUrJ1wiXScpLm9uKCdjbGljaycsIHdpbmRvd1tjbGFzc05hbWVdLmFkZE5ld1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LzQtdGJ0LXQvdC40LUg0YHRgtGA0L7QutC4LCDQuNC30LzQtdC90LXQvdC40LUg0L/RgNC40L7RgNC40YLQtdGC0LAuXG5cdCAqL1xuXHRjYk9uRHJvcCh0YWJsZSwgcm93KSB7XG5cdFx0bGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuXHRcdGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuXHRcdCQodGFibGUpLmZpbmQoJ3RyJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdtLXByaW9yaXR5JyksIDEwKTtcblx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0aWYgKCFpc05hTiggcnVsZUlkICkgJiYgb2xkUHJpb3JpdHkgIT09IG5ld1ByaW9yaXR5KSB7XG5cdFx0XHRcdHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdHByaW9yaXR5RGF0YVtydWxlSWRdID0gbmV3UHJpb3JpdHk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYgKHByaW9yaXR5V2FzQ2hhbmdlZCkge1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9jaGFuZ2VQcmlvcml0eT90YWJsZT1gKyQodGFibGUpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpLFxuXHRcdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YTogcHJpb3JpdHlEYXRhLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiDQntC60L7QvdGH0LDQvdC40LUg0YDQtdC00LDQutGC0LjRgNC+0LLQsNC90LjRjyDQv9C+0LvRjyDQstCy0L7QtNCwLlxuXHQgKiDQndC1INC+0YLQvdC+0YHQuNGC0YHRjyDQuiBzZWxlY3QuXG5cdCAqIEBwYXJhbSBlXG5cdCAqL1xuXHRlbmRFZGl0SW5wdXQoZSl7XG5cdFx0bGV0ICRlbCA9ICQoJy5jaGFuZ2VkLWZpZWxkJykuY2xvc2VzdCgndHInKTtcblx0XHQkZWwuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG9iaikge1xuXHRcdFx0bGV0IGN1cnJlbnRSb3dJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0bGV0IHRhYmxlTmFtZSAgICA9ICQob2JqKS5jbG9zZXN0KCd0YWJsZScpLmF0dHIoJ2lkJykucmVwbGFjZSgnLXRhYmxlJywgJycpO1xuXHRcdFx0aWYgKGN1cnJlbnRSb3dJZCAhPT0gdW5kZWZpbmVkICYmIHRhYmxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNlbmRDaGFuZ2VzVG9TZXJ2ZXIodGFibGVOYW1lLCBjdXJyZW50Um93SWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvQtdC90LjQtSDQvdC+0LLQvtC5INGB0YLRgNC+0LrQuCDQsiDRgtCw0LHQu9C40YbRgy5cblx0ICogQHBhcmFtIGVcblx0ICovXG5cdGFkZE5ld1JvdyhlKXtcblx0XHRsZXQgaWRUYWJsZSA9ICQoZS50YXJnZXQpLmF0dHIoJ2lkLXRhYmxlJyk7XG5cdFx0bGV0IHRhYmxlICAgPSAkKCcjJytpZFRhYmxlKTtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dGFibGUuZmluZCgnLmRhdGFUYWJsZXNfZW1wdHknKS5yZW1vdmUoKTtcblx0XHQvLyDQntGC0L/RgNCw0LLQuNC8INC90LAg0LfQsNC/0LjRgdGMINCy0YHQtSDRh9GC0L4g0L3QtSDQt9Cw0L/QuNGB0LDQvdC+INC10YnQtVxuXHRcdGxldCAkZWwgPSB0YWJsZS5maW5kKCcuY2hhbmdlZC1maWVsZCcpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0JGVsLmVhY2goZnVuY3Rpb24gKGluZGV4LCBvYmopIHtcblx0XHRcdGxldCBjdXJyZW50Um93SWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdGlmIChjdXJyZW50Um93SWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5zZW5kQ2hhbmdlc1RvU2VydmVyKGN1cnJlbnRSb3dJZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0bGV0IGlkID0gXCJuZXdcIitNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBNYXRoLmZsb29yKDUwMCkpO1xuXHRcdGxldCByb3dUZW1wbGF0ZSA9ICc8dHIgaWQ9XCInK2lkKydcIiByb2xlPVwicm93XCIgY2xhc3M9XCJldmVuXCI+Jyt0YWJsZS5maW5kKCd0ciNURU1QTEFURScpLmh0bWwoKS5yZXBsYWNlKCdURU1QTEFURScsIGlkKSsnPC90cj4nO1xuXHRcdHRhYmxlLmZpbmQoJ3Rib2R5ID4gdHI6Zmlyc3QnKS5iZWZvcmUocm93VGVtcGxhdGUpO1xuXHRcdHdpbmRvd1tjbGFzc05hbWVdLmRyb3dTZWxlY3RHcm91cChpZFRhYmxlKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1IHNlbGVjdCDRjdC70LXQvNC10L3RgtC+0LIuXG5cdCAqIEBwYXJhbSB0YWJsZUlkXG5cdCAqL1xuXHRkcm93U2VsZWN0R3JvdXAodGFibGVJZCkge1xuXHRcdCQoJyMnICsgdGFibGVJZCkuZmluZCgndHIjVEVNUExBVEUnKS5oaWRlKCk7XG5cdFx0bGV0IHNlbGVzdEdyb3VwID0gJCgnLnNlbGVjdC1ncm91cCcpO1xuXHRcdHNlbGVzdEdyb3VwLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGxldCBzZWxlY3RUeXBlID0gJChvYmopLmNsb3Nlc3QoJ3RkJykuZmluZCgnaW5wdXQnKS5hdHRyKCdzZWxlY3RUeXBlJyk7XG5cdFx0XHQkKG9iaikuZHJvcGRvd24oe1xuXHRcdFx0XHR2YWx1ZXM6IHdpbmRvd1tjbGFzc05hbWVdLm1ha2VEcm9wZG93bkxpc3Qoc2VsZWN0VHlwZSwgJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSksXG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRzZWxlc3RHcm91cC5kcm9wZG93bih7XG5cdFx0XHRvbkNoYW5nZTogd2luZG93W2NsYXNzTmFtZV0uY2hhbmdlR3JvdXBJbkxpc3QsXG5cdFx0fSk7XG5cblx0XHQkKCcjJyArIHRhYmxlSWQpLnRhYmxlRG5EKHtcblx0XHRcdG9uRHJvcDogd2luZG93W2NsYXNzTmFtZV0uY2JPbkRyb3AsXG5cdFx0XHRvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93Jyxcblx0XHRcdGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INGB0YLRgNC+0LrQuFxuXHQgKiBAcGFyYW0gdGFibGVOYW1lXG5cdCAqIEBwYXJhbSBpZCAtIHJlY29yZCBpZFxuXHQgKi9cblx0ZGVsZXRlUm93KHRhYmxlTmFtZSwgaWQpIHtcblx0XHRsZXQgdGFibGUgPSAkKCcjJysgdGFibGVOYW1lKyctdGFibGUnKTtcblx0XHRpZiAoaWQuc3Vic3RyKDAsMykgPT09ICduZXcnKSB7XG5cdFx0XHR0YWJsZS5maW5kKCd0ciMnK2lkKS5yZW1vdmUoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiB3aW5kb3dbY2xhc3NOYW1lXS5kZWxldGVSZWNvcmRBSkFYVXJsKyc/aWQ9JytpZCsnJnRhYmxlPScrdGFibGVOYW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmKHRhYmxlTmFtZSA9PT0gJ01vZHVsZVRlbGVncmFtUHJvdmlkZXInICYmICQoJyMnKyB0YWJsZU5hbWUrJy10YWJsZSB0Ym9keSB0cicpLmxlbmd0aCA9PT0gMil7XG5cdFx0XHRcdFx0JCgnIycrIHRhYmxlTmFtZSsnLXRhYmxlIHRib2R5IHRyW2lkPScraWQrJ10gaW5wdXRbY29sbmFtZT1cInBob25lX251bWJlclwiXScpLnZhbCgnJyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0dGFibGUuZmluZCgndHIjJytpZCkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0aWYgKHRhYmxlLmZpbmQoJ3Rib2R5ID4gdHInKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRcdHRhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKCc8dHIgY2xhc3M9XCJvZGRcIj48L3RyPicpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmKHRhYmxlTmFtZSA9PT0gJ01vZHVsZVRlbGVncmFtUHJvdmlkZXInKXtcblx0XHRcdGxldCBwaG9uZSA9ICQoXCIjXCIrIHRhYmxlTmFtZStcIi10YWJsZSB0cltpZD1cIitpZCtcIl0gaW5wdXRbY29sbmFtZT1waG9uZV9udW1iZXJdXCIpLnZhbCgpO1xuXHRcdFx0JC5nZXQoICcvcGJ4Y29yZS9hcGkvbW9kdWxlcy8nK2NsYXNzTmFtZSsnL2xvZ291dD9pZD0nK2lkKycmcGhvbmU9JytwaG9uZSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiDQntGC0L/RgNCw0LLQutCwINC00LDQvdC90YvRhSDQvdCwINGB0LXRgNCy0LXRgCDQv9GA0Lgg0LjQt9C80LXQvdC40Lhcblx0ICogQHBhcmFtIHRhYmxlTmFtZVxuXHQgKiBAcGFyYW0gcmVjb3JkSWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRzZW5kQ2hhbmdlc1RvU2VydmVyKHRhYmxlTmFtZSwgcmVjb3JkSWQpIHtcblx0XHRsZXQgZGF0YSA9IHsgJ3BieC10YWJsZS1pZCc6IHRhYmxlTmFtZSwgJ3BieC1yb3ctaWQnOiAgcmVjb3JkSWR9O1xuXHRcdGxldCBub3RFbXB0eSA9IGZhbHNlO1xuXHRcdCQoXCJ0ciNcIityZWNvcmRJZCArICcgLicgKyBpbnB1dENsYXNzTmFtZSkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG9iaikge1xuXHRcdFx0bGV0IGNvbE5hbWUgPSAkKG9iaikuYXR0cignY29sTmFtZScpO1xuXHRcdFx0aWYoY29sTmFtZSAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0ZGF0YVskKG9iaikuYXR0cignY29sTmFtZScpXSA9ICQob2JqKS52YWwoKTtcblx0XHRcdFx0aWYoJChvYmopLnZhbCgpICE9PSAnJyl7XG5cdFx0XHRcdFx0bm90RW1wdHkgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYobm90RW1wdHkgPT09IGZhbHNlKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JChcInRyI1wiK3JlY29yZElkK1wiIC51c2VyLmNpcmNsZVwiKS5yZW1vdmVDbGFzcygndXNlciBjaXJjbGUnKS5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG5cdFx0aWYod2luZG93W2NsYXNzTmFtZV0uc2F2aW5nUm93VGFibGUgPT09IHRydWUpe1xuXHRcdFx0Ly8g0KPQttC1INC40LTQtdGCINC00YDRg9Cz0L7QtSDRgdC+0YXRgNCw0L3QtdC90LjQtS5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uc2F2aW5nUm93VGFibGUgPSB0cnVlO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogd2luZG93W2NsYXNzTmFtZV0uc2F2ZVRhYmxlQUpBWFVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5kYXRhICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRsZXQgcm93SWQgPSByZXNwb25zZS5kYXRhWydwYngtcm93LWlkJ107XG5cdFx0XHRcdFx0bGV0IHRhYmxlID0gJCgnIycrcmVzcG9uc2UuZGF0YVsncGJ4LXRhYmxlLWlkJ10rJy10YWJsZScpO1xuXHRcdFx0XHRcdHRhYmxlLmZpbmQoXCJ0ciNcIiArIHJvd0lkICsgXCIgaW5wdXRcIikuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcblx0XHRcdFx0XHR0YWJsZS5maW5kKFwidHIjXCIgKyByb3dJZCArIFwiIGRpdlwiKS5yZW1vdmVDbGFzcygnY2hhbmdlZC1maWVsZCBsb2FkaW5nJykuYWRkQ2xhc3MoJ3RyYW5zcGFyZW50Jyk7XG5cdFx0XHRcdFx0dGFibGUuZmluZChcInRyI1wiICsgcm93SWQgKyBcIiAuc3Bpbm5lci5sb2FkaW5nXCIpLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblxuXHRcdFx0XHRcdGlmIChyb3dJZCAhPT0gcmVzcG9uc2UuZGF0YVsnbmV3SWQnXSl7XG5cdFx0XHRcdFx0XHQkKGB0ciMke3Jvd0lkfWApLmF0dHIoJ2lkJywgcmVzcG9uc2UuZGF0YVsnbmV3SWQnXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JChcInRyI1wiICsgcmVjb3JkSWQgKyBcIiAuc3Bpbm5lci5sb2FkaW5nXCIpLmFkZENsYXNzKCd1c2VyIGNpcmNsZScpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnNhdmluZ1Jvd1RhYmxlID0gZmFsc2U7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgXCJzZXNzaW9uL2luZGV4XCI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIENoYW5nZSBzb21lIGZvcm0gZWxlbWVudHMgY2xhc3NlcyBkZXBlbmRzIG9mIG1vZHVsZSBzdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzVG9nZ2xlKCkge1xuXHRcdGxldCBzdGVwMyA9ICQoXCIjc3RlcDNcIik7XG5cdFx0aWYgKHdpbmRvd1tjbGFzc05hbWVdLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRzdGVwMy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXMuc2hvdygpO1xuXHRcdFx0aWYod2luZG93W2NsYXNzTmFtZV0uc3RhdHVzZXNUaW1lciA9PT0gbnVsbCl7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLnN0YXR1c2VzVGltZXI9MTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hlY2tTdGF0dXNlcygpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHN0ZXAzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogU2VuZCBjb21tYW5kIHRvIHJlc3RhcnQgbW9kdWxlIHdvcmtlcnMgYWZ0ZXIgZGF0YSBjaGFuZ2VzLFxuXHQgKiBBbHNvIHdlIGNhbiBkbyBpdCBvbiBUZW1wbGF0ZUNvbmYtPm1vZGVsc0V2ZW50Q2hhbmdlRGF0YSBtZXRob2Rcblx0ICovXG5cdGFwcGx5Q29uZmlndXJhdGlvbkNoYW5nZXMoKSB7XG5cdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdVcGRhdGluZycpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9gK2NsYXNzTmFtZStgL3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS5jaGFuZ2VTdGF0dXMoJ0Nvbm5lY3RlZCcpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uY2hhbmdlU3RhdHVzKCdEaXNjb25uZWN0ZWQnKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBXZSBjYW4gbW9kaWZ5IHNvbWUgZGF0YSBiZWZvcmUgZm9ybSBzZW5kXG5cdCAqIEBwYXJhbSBzZXR0aW5nc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHdpbmRvd1tjbGFzc05hbWVdLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHQvKipcblx0ICogU29tZSBhY3Rpb25zIGFmdGVyIGZvcm1zIHNlbmRcblx0ICovXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHR3aW5kb3dbY2xhc3NOYW1lXS5hcHBseUNvbmZpZ3VyYXRpb25DaGFuZ2VzKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGZvcm0gcGFyYW1ldGVyc1xuXHQgKi9cblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHdpbmRvd1tjbGFzc05hbWVdLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke2lkVXJsfS9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSB3aW5kb3dbY2xhc3NOYW1lXS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHdpbmRvd1tjbGFzc05hbWVdLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB3aW5kb3dbY2xhc3NOYW1lXS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGUgdGhlIG1vZHVsZSBzdGF0ZSBvbiBmb3JtIGxhYmVsXG5cdCAqIEBwYXJhbSBzdGF0dXNcblx0ICovXG5cdGNoYW5nZVN0YXR1cyhzdGF0dXMpIHtcblx0XHRzd2l0Y2ggKHN0YXR1cykge1xuXHRcdFx0Y2FzZSAnTm90QWxsQ29ubmVjdGVkJzpcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1c1xuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnZ3JleScpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnZ3JlZW4nKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnb3JhbmdlJyk7XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUubW9kdWxlX3RlbGVncmFtX3Byb3ZpZGVyTm90QWxsQ29ubmVjdGVkKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdDb25uZWN0ZWQnOlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmV5Jylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3JlZCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdvcmFuZ2UnKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JlZW4nKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJDb25uZWN0ZWQpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Rpc2Nvbm5lY3RlZCc6XG5cdFx0XHRcdHdpbmRvd1tjbGFzc05hbWVdLiRtb2R1bGVTdGF0dXNcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2dyZWVuJylcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ3JlZCcpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdvcmFuZ2UnKVxuXHRcdFx0XHRcdC5hZGRDbGFzcygnZ3JleScpO1xuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlckRpc2Nvbm5lY3RlZCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnVXBkYXRpbmcnOlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmVlbicpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnb3JhbmdlJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1vZHVsZV90ZWxlZ3JhbV9wcm92aWRlclVwZGF0ZVN0YXR1c31gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR3aW5kb3dbY2xhc3NOYW1lXS4kbW9kdWxlU3RhdHVzXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdncmVlbicpXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdyZWQnKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnb3JhbmdlJylcblx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2dyZXknKTtcblx0XHRcdFx0d2luZG93W2NsYXNzTmFtZV0uJG1vZHVsZVN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5tb2R1bGVfdGVsZWdyYW1fcHJvdmlkZXJEaXNjb25uZWN0ZWQpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHdpbmRvd1tjbGFzc05hbWVdLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=