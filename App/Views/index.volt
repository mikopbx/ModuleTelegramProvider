
<form class="ui large grey segment form" id="module-telegram-provider-form">
    {{ form.render('id') }}
    <div class="ui top attached tabular menu">
      <a class="item active" data-tab="first">{{ t._("Identifiers") }} </a>
      <a class="item" data-tab="second">{{ t._("MessageTemplates") }} </a>
      <a class="item" data-tab="callback">{{ t._("CallbackText") }} </a>
    </div>
    <br>
    <div class="ui grey top right attached label" id="status">{{ t._("module_telegram_providerUpdateStatus") }}</div>
    <div class="ui bottom attached tab active" data-tab="first">
       <h4 class="ui grey header">
            {{ t._("module_telegram_providerStep1") }}
             <div class="sub header">
                {{ t._("module_telegram_providerStep1Part1") }}
                <a href="https://my.telegram.org/auth" target="_blank"> {{ t._("module_telegram_providerUrlGetId") }} </a>
                {{ t._("module_telegram_providerStep1Part2") }}
            </div>
        </h4>
        <div class="ten wide field">
            <label class="ui grey header" >{{ t._('module_telegram_provider_api_id') }}</label>
            {{ form.render('api_id') }}
        </div>
        <div class="ten wide field">
            <label class="ui grey header">{{ t._('module_telegram_provider_api_hash') }}</label>
            {{ form.render('api_hash') }}
        </div>
        <h4 class="ui grey header">
            {{ t._("module_telegram_providerStep2") }}
            <div class="sub header">{{ t._("module_telegram_providerStep2Title") }} </div>
        </h4>
    </div>
    <div class="ui bottom attached tab" data-tab="second">
        <h4 class="ui grey header">
          {{ t._("businessCardText") }}
           <div class="sub header">
             {{ t._("businessCardSubText") }}
          </div>
        </h4>
        <div class="ten wide field">
            {{ form.render('businessCardText') }}
        </div>
        <h4 class="ui grey header">
            {{ t._("keyboardText") }}
             <div class="sub header">
                {{ t._("keyboardSubText") }}
             </div>
        </h4>
        <div class="ten wide field">
            {{ form.render('keyboardText') }}
        </div>

        <h4 class="ui grey header">
            {{ t._("autoAnswerText") }}
             <div class="sub header">
                {{ t._("autoAnswerTextSubText") }}
             </div>
        </h4>
        <div class="ten wide field">
            {{ form.render('autoAnswerText') }}
        </div>
    </div>
    <div class="ui bottom attached tab" data-tab="callback">
        <h4 class="ui grey header">
            {{ t._("callbackQueueText") }}
            <div class="sub header">
                {{ t._('callbackQueueSubText') }}
            </div>
        </h4>
        <div class="ten wide field disability">
            {{ form.render('callbackQueue') }}
        </div>
        <br><br><br><br>
    </div>
    {{ partial("partials/submitbutton") }}
    <br>
    <br>
</form>
<div class="ui segment" id="step3">
    <h4 class="ui grey header">
        {{ t._("module_telegram_providerStep3") }}
        <div class="sub header">{{ t._("module_telegram_providerStep3Title") }} </div>
    </h4>
    <div class="ui grid">
        <div class="ui row">
            <div class="ui five wide column">
                {{ link_to("#", '<i class="add phone icon"></i>  '~t._('module_telegram_AddNewRecord'), "class": "ui blue button", "id":"add-new-row", "id-table":"ModuleTelegramProvider-table") }}
            </div>
        </div>
    </div>
    <br>
    <table id="ModuleTelegramProvider-table" class="ui small very compact single line table"> </table>
    <h4 class="ui grey header">
        {{ t._("module_telegram_providerStep4") }}
        <div class="sub header">{{ t._("module_telegram_providerStep4Title") }} </div>
    </h4>
    <div id="dimmer-wait-status" class="ui dimmer">
        <div class="ui massive text loader"> {{ t._("module_telegram_providerWaitAuth") }} </div>
    </div>
</div>

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
