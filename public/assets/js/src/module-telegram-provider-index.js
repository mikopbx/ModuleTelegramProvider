/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */
const idUrl     = 'module-telegram-provider';
const idForm    = 'module-telegram-provider-form';
const className = 'ModuleTelegramProvider';
const inputClassName = 'mikopbx-module-input';

/* global globalRootUrl, globalTranslate, Form, Config, $ */
const ModuleTelegramProvider = {
	$formObj: $('#'+idForm),
	$checkBoxes: $('#'+idForm+' .ui.checkbox'),
	$dropDowns: $('#'+idForm+' .ui.dropdown'),
	saveTableAJAXUrl: globalRootUrl + idUrl + "/saveTableData",
	deleteRecordAJAXUrl: globalRootUrl + idUrl + "/delete",
	$disabilityFields: $('#'+idForm+'  .disability'),
	$statusToggle: $('#module-status-toggle'),
	$moduleStatus: $('#status'),
	authProcess: '',
	/**
	 * Field validation rules
	 * https://semantic-ui.com/behaviors/form.html
	 */
	validateRules: {
		textField: {
			identifier: 'text_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.mod_tplValidateValueIsEmpty,
				},
			],
		},
		areaField: {
			identifier: 'text_area_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.mod_tplValidateValueIsEmpty,
				},
			],
		},
		passwordField: {
			identifier: 'password_field',
			rules: [
				{
					type: 'empty',
					prompt: globalTranslate.mod_tplValidateValueIsEmpty,
				},
			],
		},
	},
	/**
	 * On page load we init some Semantic UI library
	 */
	initialize() {
		// инициализируем чекбоксы и выподающие менюшки
		window[className].$checkBoxes.checkbox();
		window[className].$dropDowns.dropdown();
		window.addEventListener('ModuleStatusChanged', window[className].checkStatusToggle);
		window[className].initializeForm();
		$('.menu .item').tab();

		$.get( idUrl + '/getTablesDescription', function( result ) {
			for (let key in result['data']) {
				let tableName = key + '-table';
				if( $('#'+tableName).attr('id') === undefined){
					continue;
				}
				window[className].initTable(tableName, result['data'][key]);
			}
		});
		window[className].checkStatusToggle();
	},
    checkStatuses(){
        $.get( '/pbxcore/api/modules/'+className+'/statuses', function( response ) {
			let haveDisable = false;
			for (let id in response.data) {
				let uriButton 		= $('#'+className+'-table tr[id='+id+'] button.ui.button');
				let elements = {
					'gw': $('#'+className+'-table tr[id='+id+'] a[data-name="login-gw"] i'),
					'user': $('#'+className+'-table tr[id='+id+'] a[data-name="login-user"] i'),
					'bot': $('#'+className+'-table tr[id='+id+'] a[data-name="login-bot"] i')
				};
				for (let keyElement in elements) {
					let elButton  = elements[keyElement];
					$('#'+className+'-table tr[id='+id+'] a[data-name="login-'+keyElement+'"]').attr('data-tooltip', globalTranslate['module_telegram_provider_status_'+keyElement+'_'+response['data'][id][keyElement] ]);
					if(response['data'][id][keyElement] === 'OK') {
						elButton.removeClass('red orange');
						elButton.addClass('green');
						if (keyElement === 'gw') {
							uriButton.show();
						}
					}else if(response['data'][id][keyElement] === 'WAIT_START'){
						elButton.removeClass('green red');
						elButton.addClass('orange');
						if(keyElement==='gw'){
							haveDisable = true;
							uriButton.hide();
						}
					}else{
						elButton.removeClass('green orange');
						elButton.addClass('red');
						if(keyElement==='gw'){
							haveDisable = true;
							uriButton.hide();
						}
					}
				}
            }
			if(haveDisable === true){
				window[className].changeStatus('NotAllConnected');
			}else{
				window[className].changeStatus('Connected');
			}
            setTimeout(window[className].checkStatusToggle, 10000);
        });
    },

	/**
	 * Запуск процесса авторизации.
	 * @param id
	 * @param failAuth
	 */
	startAuth(id, failAuth) {
		$("#error-message").hide();
		$.get( '/pbxcore/api/modules/'+className+'/start-auth?id='+id+'&type='+window[className].authProcess, function( response ) {
			if(response.result === false){
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
	checkStatus(id) {
		if(window[className].authProcess === ''){
			return;
		}
		let elDimmer = $('#dimmer-wait-status');
		elDimmer.addClass('active');
		$.get( '/pbxcore/api/modules/'+className+'/status?id='+id, function( response ) {
			if(response.result === false){
				setTimeout(window[className].checkStatus, 5000, id);
				return;
			}
			let statusData = response.data[window[className].authProcess];
			if(statusData.status === 'Done'){
				window[className].authProcess = '';
				elDimmer.removeClass('active');
			}else if(statusData.status === 'WaitInput' && statusData.data.trim() === ''){
				$('#command-dialog form div.field label').text(statusData.output);
				$('input[id=command]').val('');
				let phone = $('#ModuleTelegramProvider-table tr[id='+id+'] input[colname="phone_number"]').val();
				$('#command-dialog a.ui.ribbon.label').text(phone);
				$('#command-dialog')
					.modal({
						closable  : false,
						onDeny    : function(){
							$.get( '/pbxcore/api/modules/'+className+'/cancel-auth?id='+id);
							elDimmer.removeClass('active');
						},
						onApprove : function() {
							let elCommand = $('#command');
							let command = elCommand.val();
							elCommand.val('');
							$.get( '/pbxcore/api/modules/'+className+'/enter-command?id='+id+'&command='+command+'&key='+window[className].authProcess, function( responseCmd ) {
								if(responseCmd.result === true){
									setTimeout(window[className].checkStatus, 1000, id);
								}
							});
						},
					})
					.modal('show');
			}else if(statusData.status === 'Error'){
				window[className].authProcess = '';
				$("#error-message").show();
				$("#error-message .header").text(globalTranslate.module_telegram_providerError);
				$("#error-message .body").text(statusData.output);
				elDimmer.removeClass('active');
			}else{
				setTimeout(window[className].checkStatus, 2000, id);
			}
		});
	},

	/**
	 *
	 * @param selectType
	 * @param selected
	 * @returns {[{name: string, value: string, selected: boolean}]}
	 */
	makeDropdownList(selectType, selected) {
		const values = [
			{
				name: ' --- ',
				value: '',
				selected: ('' === selected),
			}
		];
		$('#'+selectType+' option').each((index, obj) => {
			values.push({
				name: obj.text,
				value: obj.value,
				selected: (selected === obj.value),
			});
		});
		return values;
	},
	/**
	 * Обработка изменения группы в списке
	 */
	changeGroupInList(value, text, choice) {
		let tdInput = $(choice).closest('td').find('input');
		tdInput.attr('data-value', 	value);
		tdInput.attr('value', 		value);
		let currentRowId = $(choice).closest('tr').attr('id');
		let tableName    = $(choice).closest('table').attr('id').replace('-table', '');
		if (currentRowId !== undefined && tableName !== undefined) {
			window[className].sendChangesToServer(tableName, currentRowId);
		}
	},

	/**
	 * Add new Table.
	 */
	initTable(tableName, options) {
		let columns = [];
		let columnsArray4Sort = []
		for (let colName in options['cols']) {
			columns.push( {data: colName});
			columnsArray4Sort.push(colName);
		}
		$('#' + tableName).DataTable( {
			ajax: {
				url: idUrl + options.ajaxUrl + '?table=' +tableName.replace('-table', ''),
				dataSrc: 'data'
			},
			columns: columns,
			paging: false,
			sDom: 'rtip',
			deferRender: true,
			pageLength: 17,
			infoCallback( settings, start, end, max, total, pre ) {
				return '';
			},
			language: SemanticLocalization.dataTableLocalisation,
			ordering: false,
			/**
			 * Builder row presentation
			 * @param row
			 * @param data
			 */
			createdRow(row, data) {
				let cols    = $('td', row);
				let headers = $('#'+ tableName + ' thead tr th');
				for (let key in data) {
					let index = columnsArray4Sort.indexOf(key);
					if(key === 'rowIcon'){
						cols.eq(index).html('<i class="ui ' + data[key] + ' circle icon"></i>');
					}else if(key === 'delButton'){
						let uri = '127.0.0.1:'+(30000+1*data.DT_RowId);
						let templateDeleteButton = '<div class="ui small basic icon buttons action-buttons">' +
							'<button data-name="uri-button" class="ui button clipboard disability" data-tooltip="'+globalTranslate.module_telegram_providerCopy+'"  data-position="left center" data-clipboard-text="'+uri+'" style="display: none;">sip:'+uri+'</button>'+
							'<a data-name="login-gw"  href="" class="ui button popuped"><i class="icon telegram"></i></a>'+
							'<a data-name="login-user"  href="" class="ui button popuped"><i class="icon envelope"></i></a>'+
							'<a data-name="login-bot"  href="" class="ui button popuped"><i class="icon android secret"></i></a>'+
							'<a data-name="delete-button" href="' + window[className].deleteRecordAJAXUrl + '/' +
							data.DT_RowId + '" data-value = "' + data.DT_RowId + '"' +
							' class="ui button delete two-steps-delete popuped" data-tooltip="'+globalTranslate.module_telegram_provider_action_remove+'" data-content="' + globalTranslate.bt_ToolTipDelete + '">' +
							'<i class="icon trash red"></i></a></div>';
						cols.eq(index).html(templateDeleteButton);
						cols.eq(index).addClass('right aligned');
					}else if(key === 'priority'){
						cols.eq(index).addClass('dragHandle')
						cols.eq(index).html('<i class="ui sort circle icon"></i>');
						// Приоритет устанавливаем для строки.
						$(row).attr('m-priority', data[key]);
					}else{
						let template = '<div class="ui transparent fluid input inline-edit">' +
							'<input colName="'+key+'" class="'+inputClassName+'" type="text" data-value="'+data[key] + '" value="' + data[key] + '"></div>';
						$('td', row).eq(index).html(template);
					}
					if(options['cols'][key] === undefined){
						continue;
					}
					let additionalClass = options['cols'][key]['class'];
					if(additionalClass !== undefined && additionalClass !== ''){
						headers.eq(index).addClass(additionalClass);
					}
					let header = options['cols'][key]['header'];
					if(header !== undefined && header !== ''){
						headers.eq(index).html(header);
					}

					let selectMetaData = options['cols'][key]['select'];
					if(selectMetaData !== undefined){
						let newTemplate = $('#template-select').html().replace('PARAM', data[key]);
						let template = '<input class="'+inputClassName+'" colName="'+key+'" selectType="'+selectMetaData+'" style="display: none;" type="text" data-value="'+data[key] + '" value="' + data[key] + '"></div>';
						cols.eq(index).html(newTemplate + template);
					}
				}
			},
			/**
			 * Draw event - fired once the table has completed a draw.
			 */
			drawCallback(settings) {
				window[className].drowSelectGroup(settings.sTableId);
			},
		} );

		let body = $('body');
		// Клик по полю. Вход для редактирования значения.
		body.on('focusin', '.'+inputClassName, function (e) {
			$(e.target).transition('glow');
			$(e.target).closest('div').removeClass('transparent').addClass('changed-field');
			$(e.target).attr('readonly', false);
		})
		// Отправка формы на сервер по Enter или Tab
		$(document).on('keydown', function (e) {
			let keyCode = e.keyCode || e.which;
			if (keyCode === 13 || keyCode === 9 && $(':focus').hasClass('mikopbx-module-input')) {
				window[className].endEditInput();
			}
		});

		body.on('click', 'a[data-name="login-gw"]', function (e) {
			e.preventDefault();
			window[className].authProcess = 'gw';
			let currentRowId = $(e.target).closest('tr').attr('id');
			window[className].startAuth(currentRowId);
		});		
		body.on('click', 'a[data-name="login-user"]', function (e) {
			e.preventDefault();
			window[className].authProcess = 'user';
			let currentRowId = $(e.target).closest('tr').attr('id');
			window[className].startAuth(currentRowId);
		});
		body.on('click', 'a[data-name="login-bot"]', function (e) {
			e.preventDefault();
			window[className].authProcess = 'bot';
			let currentRowId = $(e.target).closest('tr').attr('id');
			window[className].startAuth(currentRowId);
		});
		body.on('click', 'button[data-name="uri-button"]', function (e) {
			e.preventDefault();
		});
		body.on('click', 'a.delete', function (e) {
			e.preventDefault();
			let currentRowId = $(e.target).closest('tr').attr('id');
			let elTableName    = $(e.target).closest('table').attr('id').replace('-table', '');
			window[className].deleteRow(elTableName, currentRowId);
		}); // Добавление новой строки

		let clipboard = new ClipboardJS('.clipboard');
		clipboard.on('error', function (e) {
			console.error('Action:', e.action);
			console.error('Trigger:', e.trigger);
		});
		// Отправка формы на сервер по уходу с поля ввода
		body.on('focusout', '.'+inputClassName, window[className].endEditInput);

		// Кнопка "Добавить новую запись"
		$('[id-table = "'+tableName+'"]').on('click', window[className].addNewRow);
	},

	/**
	 * Перемещение строки, изменение приоритета.
	 */
	cbOnDrop(table, row) {
		let priorityWasChanged = false;
		const priorityData = {};
		$(table).find('tr').each((index, obj) => {
			const ruleId = $(obj).attr('id');
			const oldPriority = parseInt($(obj).attr('m-priority'), 10);
			const newPriority = obj.rowIndex;
			if (!isNaN( ruleId ) && oldPriority !== newPriority) {
				priorityWasChanged = true;
				priorityData[ruleId] = newPriority;
			}
		});
		if (priorityWasChanged) {
			$.api({
				on: 'now',
				url: `${globalRootUrl}${idUrl}/changePriority?table=`+$(table).attr('id').replace('-table', ''),
				method: 'POST',
				data: priorityData,
			});
		}
	},

	/**
	 * Окончание редактирования поля ввода.
	 * Не относится к select.
	 * @param e
	 */
	endEditInput(e){
		let $el = $('.changed-field').closest('tr');
		$el.each(function (index, obj) {
			let currentRowId = $(obj).attr('id');
			let tableName    = $(obj).closest('table').attr('id').replace('-table', '');
			if (currentRowId !== undefined && tableName !== undefined) {
				window[className].sendChangesToServer(tableName, currentRowId);
			}
		});
	},

	/**
	 * Добавление новой строки в таблицу.
	 * @param e
	 */
	addNewRow(e){
		let idTable = $(e.target).attr('id-table');
		let table   = $('#'+idTable);
		e.preventDefault();
		table.find('.dataTables_empty').remove();
		// Отправим на запись все что не записано еще
		let $el = table.find('.changed-field').closest('tr');
		$el.each(function (index, obj) {
			let currentRowId = $(obj).attr('id');
			if (currentRowId !== undefined) {
				window[className].sendChangesToServer(currentRowId);
			}
		});
		let id = "new"+Math.floor(Math.random() * Math.floor(500));
		let rowTemplate = '<tr id="'+id+'" role="row" class="even">'+table.find('tr#TEMPLATE').html().replace('TEMPLATE', id)+'</tr>';
		table.find('tbody > tr:first').before(rowTemplate);
		window[className].drowSelectGroup(idTable);
	},
	/**
	 * Обновление select элементов.
	 * @param tableId
	 */
	drowSelectGroup(tableId) {
		$('#' + tableId).find('tr#TEMPLATE').hide();
		let selestGroup = $('.select-group');
		selestGroup.each((index, obj) => {
			let selectType = $(obj).closest('td').find('input').attr('selectType');
			$(obj).dropdown({
				values: window[className].makeDropdownList(selectType, $(obj).attr('data-value')),
			});
		});
		selestGroup.dropdown({
			onChange: window[className].changeGroupInList,
		});

		$('#' + tableId).tableDnD({
			onDrop: window[className].cbOnDrop,
			onDragClass: 'hoveringRow',
			dragHandle: '.dragHandle',
		});
	},
	/**
	 * Удаление строки
	 * @param tableName
	 * @param id - record id
	 */
	deleteRow(tableName, id) {
		let table = $('#'+ tableName+'-table');
		if (id.substr(0,3) === 'new') {
			table.find('tr#'+id).remove();
			return;
		}
		$.api({
			url: window[className].deleteRecordAJAXUrl+'?id='+id+'&table='+tableName,
			on: 'now',
			onSuccess(response) {
				if(tableName === 'ModuleTelegramProvider' && $('#'+ tableName+'-table tbody tr').length === 2){
					$('#'+ tableName+'-table tbody tr[id='+id+'] input[colname="phone_number"]').val('');
					return;
				}
				if (response.success) {
					table.find('tr#'+id).remove();
					if (table.find('tbody > tr').length === 0) {
						table.find('tbody').append('<tr class="odd"></tr>');
					}
				}
			}
		});
	},

	/**
	 * Отправка данных на сервер при измении
	 * @param tableName
	 * @param recordId
	 * @returns {boolean}
	 */
	sendChangesToServer(tableName, recordId) {
		let data = { 'pbx-table-id': tableName, 'pbx-row-id':  recordId};
		let notEmpty = false;
		$("tr#"+recordId + ' .' + inputClassName).each(function (index, obj) {
			let colName = $(obj).attr('colName');
			if(colName !== undefined){
				data[$(obj).attr('colName')] = $(obj).val();
				if($(obj).val() !== ''){
					notEmpty = true;
				}
			}
		});
		if(notEmpty === false){
			return;
		}
		$("tr#"+recordId+" .user.circle").removeClass('user circle').addClass('spinner loading');
		if(window[className].savingRowTable === true){
			// Уже идет другое сохранение.
			return;
		}
		window[className].savingRowTable = true;
		$.api({
			url: window[className].saveTableAJAXUrl,
			on: 'now',
			method: 'POST',
			data: data,
			successTest(response) {
				return response !== undefined && Object.keys(response).length > 0 && response.success === true;
			},
			onSuccess(response) {
				window[className].savingRowTable = false;
				if (response.data !== undefined) {
					let rowId = response.data['pbx-row-id'];
					let table = $('#'+response.data['pbx-table-id']+'-table');
					table.find("tr#" + rowId + " input").attr('readonly', true);
					table.find("tr#" + rowId + " div").removeClass('changed-field loading').addClass('transparent');
					table.find("tr#" + rowId + " .spinner.loading").addClass('user circle').removeClass('spinner loading');

					if (rowId !== response.data['newId']){
						$(`tr#${rowId}`).attr('id', response.data['newId']);
					}
				}
			},
			onFailure(response) {
				window[className].savingRowTable = false;
				if (response.message !== undefined) {
					UserMessage.showMultiString(response.message);
				}
				$("tr#" + recordId + " .spinner.loading").addClass('user circle').removeClass('spinner loading');
			},
			onError(errorMessage, element, xhr) {
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
	checkStatusToggle() {
		if (window[className].$statusToggle.checkbox('is checked')) {
			window[className].$disabilityFields.removeClass('disabled');
			window[className].$moduleStatus.show();
			setTimeout(window[className].checkStatuses, 10);
		} else {
			window[className].$disabilityFields.addClass('disabled');
			window[className].$moduleStatus.hide();
		}
	},
	/**
	 * Send command to restart module workers after data changes,
	 * Also we can do it on TemplateConf->modelsEventChangeData method
	 */
	applyConfigurationChanges() {
		window[className].changeStatus('Updating');
		$.api({
			url: `${Config.pbxUrl}/pbxcore/api/modules/`+className+`/reload`,
			on: 'now',
			successTest(response) {
				// test whether a JSON response is valid
				return Object.keys(response).length > 0 && response.result === true;
			},
			onSuccess() {
				window[className].changeStatus('Connected');
			},
			onFailure() {
				window[className].changeStatus('Disconnected');
			},
		});
	},
	/**
	 * We can modify some data before form send
	 * @param settings
	 * @returns {*}
	 */
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = window[className].$formObj.form('get values');
		return result;
	},
	/**
	 * Some actions after forms send
	 */
	cbAfterSendForm() {
		window[className].applyConfigurationChanges();
	},
	/**
	 * Initialize form parameters
	 */
	initializeForm() {
		Form.$formObj = window[className].$formObj;
		Form.url = `${globalRootUrl}${idUrl}/save`;
		Form.validateRules = window[className].validateRules;
		Form.cbBeforeSendForm = window[className].cbBeforeSendForm;
		Form.cbAfterSendForm = window[className].cbAfterSendForm;
		Form.initialize();
	},
	/**
	 * Update the module state on form label
	 * @param status
	 */
	changeStatus(status) {
		switch (status) {
			case 'NotAllConnected':
				window[className].$moduleStatus
					.removeClass('grey')
					.removeClass('red')
					.removeClass('green')
					.addClass('orange');
				window[className].$moduleStatus.html(globalTranslate.module_telegram_providerNotAllConnected);
				break;
			case 'Connected':
				window[className].$moduleStatus
					.removeClass('grey')
					.removeClass('red')
					.removeClass('orange')
					.addClass('green');
				window[className].$moduleStatus.html(globalTranslate.module_telegram_providerConnected);
				break;
			case 'Disconnected':
				window[className].$moduleStatus
					.removeClass('green')
					.removeClass('red')
					.removeClass('orange')
					.addClass('grey');
				window[className].$moduleStatus.html(globalTranslate.module_telegram_providerDisconnected);
				break;
			case 'Updating':
				window[className].$moduleStatus
					.removeClass('green')
					.removeClass('red')
					.removeClass('orange')
					.addClass('grey');
				window[className].$moduleStatus.html(`<i class="spinner loading icon"></i>${globalTranslate.module_telegram_providerUpdateStatus}`);
				break;
			default:
				window[className].$moduleStatus
					.removeClass('green')
					.removeClass('red')
					.removeClass('orange')
					.addClass('grey');
				window[className].$moduleStatus.html(globalTranslate.module_telegram_providerDisconnected);
				break;
		}
	},
};

$(document).ready(() => {
	window[className].initialize();
});

