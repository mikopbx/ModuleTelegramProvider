
<form class="ui large grey segment form" id="module-telegram-provider-form">
    {{ form.render('id') }}

    <div class="ui grey top right attached label" id="status">{{ t._("module_telegram_providerUpdateStatus") }}</div>

    <div class="ten wide field">
        <label >{{ t._('module_telegram_provider_api_id') }}</label>
        {{ form.render('api_id') }}
    </div>
    <div class="ten wide field">
        <label >{{ t._('module_telegram_provider_api_hash') }}</label>
        {{ form.render('api_hash') }}
    </div>
    <a href="https://my.telegram.org/auth" target="_blank"> {{ t._("module_telegram_providerUrlGetId") }} </a>
    <br>
    <br>
    <div class="ui grid">
        <div class="ui row">
            <div class="ui five wide column">
                {{ link_to("#", '<i class="add phone icon"></i>  '~t._('module_telegram_AddNewRecord'), "class": "ui blue button", "id":"add-new-row", "id-table":"ModuleTelegramProvider-table") }}
            </div>
        </div>
    </div>
    <br>
    <table id="ModuleTelegramProvider-table" class="ui small very compact single line table"></table>
    <br>
    {{ partial("partials/submitbutton",['indexurl':'pbx-extension-modules/index/']) }}
</form>
<div id="error-message" class="ui warning message" style="display: none;">
    <div class="header">

    </div>
    <div class="body">

    </div>
</div>

<div class="ui modal" id='command-dialog'>
  <a class="ui blue ribbon label"></a>
  <div class="header">
    <form class="ui form" onsubmit="return false">
        <div class="field">
            <label>Enter auth code:</label>
            <input id='command' type="text" name="command" placeholder="">
        </div>
    </form>
  </div>
  <div class="actions">
    <button class="ui negative icon button">
        <i class="close icon"></i>
    </button>
    <button class="ui positive icon button">
        <i class="checkmark icon"></i>
    </button>
  </div>
</div>
