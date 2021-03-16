//"use strict"
/*
window.onload = function() {
    function updateLabel() {
        document.getElementById('toggle_button').value = "Disable";
    }

    updateLabel();

    chrome.tabs.query({active : true, currentWindow : true}, tabs => {
        const tabId = tabs[0].id;

    })
}
*/

function get(selector) {
    var select = selector.charAt(0);
    var body = selector.slice(1);
    if(select == ".")
        return document.getElementsByClassName(body)[0];
    else if(select == "#")
        return document.getElementById(body);
    else
        return document.getElementById(selector);
}
var ConnectPort = chrome.runtime.connect({name:"easyblock-port"});
let history = [];
var buffer = [];
var RecieveFunction = null;
var Enabled = true;
var EnableEffectObjects = [get(".history-holder"),get("#ADD-URL")];
var Requests = [];

function str(obj) {
    return JSON.stringify(obj);
}

function strweight(str) {
    for(var a = 0; a < str.length;a+=1) {
        if(str[a] != ' ' && str[a] != '\n' && str[a] != '') return true;
    }
    return false;
}


function Send(data) {
    ConnectPort.postMessage(data);
}

function ClearHistory() {
    openfw({title:"Подтверждение",msg:"Вы точно хотите очистить историю?",buttons:"yes-cancel",Yes:function() {SendRequest({request:"CLEAR_HISTORY"},function(data) {UpdateHistoryList();}); closefw(); },Cancel:closefw});
}

function AllowURL(id) {
    openfw({title:"Подтверждение",msg:"Вы точно хотите разрешить данный URL?", buttons:"yes-cancel",Yes:function() {
        SendRequest({request:"REMOVE_DOMAIN",url:history[id].url},function(data) {
            UpdateHistoryList();
        });
        closefw();
    },Cancel:closefw});
}

function UpdateHistoryList() {
    SendRequest({request:"GET_HISTORY"},function(data) {
        history = data.value;
        if(!history) {
            return;
        }
        var list = get(".holder-content");
        list.innerHTML = "";
        var innerhtml = "";
        for(var a = 0; a< history.length;a+=1) {
            innerhtml += '<div class="history-unit"><h1>Заблокировано (' +history[a].count + ')</h1><p><strong>URL</strong>:' + history[a].url +'</p><input type="button" id="' +'allow' +a +'" value="Разрешить"></div>';
        }
        if(history.length == 0) {
            innerhtml += '<p class="empty-title">Нет блокировок.</p>';
        }
        list.innerHTML = innerhtml;

        for(var a = 0; a < history.length;a+=1) {
            get("#allow" + a).onclick = function() {var id = parseInt(this.id.slice(5)); AllowURL(id);};
        }
        var scrlsurf = get(".holder-scrollable-surface");
        scrlsurf.scrollTo({
            top:scrlsurf.scrollHeight
        });
    });
}

function GetEnabled() {
    SendRequest({request:"GET_ENABLED"},function(data){
        if(data == null || data == undefined) return;
        Enabled = data.value;
        if(Enabled) {
            for(var a = 0; a < EnableEffectObjects.length;a+=1) {
                EnableEffectObjects[a].classList.remove("disabled");
            }
            get("#ENABLE").value = "Включено";
        }
        else {
            for(var a = 0; a < EnableEffectObjects.length;a+=1) {
                EnableEffectObjects[a].classList.add("disabled");
            }
            get("#ENABLE").value = "Выключено";
        }
    });
}

function ToggleEnabled() {
    SendRequest({request:"SET_ENABLED",value:!Enabled},function(data) {
        GetEnabled();
    });
}

function RecieveRequest() {
    if(RecieveFunction != null || Requests.length == 0) return; 
    var req = Requests.shift();
    Send(req.data);
    RecieveFunction = req.onRecieve;
}

function SendRequest(Data,OnRecieve) {
    Requests.push({data:Data,onRecieve:OnRecieve});
    RecieveRequest();
}

function MessageRecieved(data) {
    if(RecieveFunction != null) RecieveFunction(data);
    RecieveFunction = null;
    RecieveRequest();
}

function light(value) {
    var content = get("#main-content");
    var koeff = value? 1:0.45;
    var brightness = "brightness(" + (100 * koeff) +"%)";
    content.style.filter = brightness;
    var bgKey = 255 * koeff;
    document.body.style.background = "rgb("+bgKey+"," + bgKey+","+bgKey+")"; 
}

function closefw() {
    light(true);
    var fw = get(".floating-window");
    fw.classList.remove("enable");
    fw.classList.add("disable");
}

function openfw(params) {
    if(!params.buttons) return;
    var innerhtml = '<div class="content">';
    innerhtml += '<h1 class="title">' + (params.title? params.title:"NULL")+'</h1>';
    innerhtml += '<p class="alert-msg">' +(params.msg? params.msg:"NULL")+'</p>';
    if(params.type == "prompt") {
        innerhtml += '<input type="text" placeholder="' + (params.placeholder?params.placeholder:"") +'" id="PROMPT">';
    }
    if(params.buttons == "ok") 
        innerhtml += '<input type="button" value="OK" id="OK">';
    else if(params.buttons == "ok-cancel") {
        innerhtml += '<input type="button" value="OK" id="OK">';
        innerhtml += '<input type="button" value="Отмена" id="CANCEL">';
    }
    else if(params.buttons == "yes-no") {
        innerhtml += '<input type="button" value="Да" id="YES">';
        innerhtml += '<input type="button" value="Нет" id="NO">';
    }
    else if (params.buttons == "yes-cancel") {
        innerhtml += '<input type="button" value="Да" id="YES">';
        innerhtml += '<input type="button" value="Отмена" id="CANCEL">';
    }
    innerhtml += '</div>';
    light(false);
    var fw = get(".floating-window");
    fw.innerHTML = innerhtml;
    fw.classList.remove("disable");
    fw.classList.add("enable");
    if(params.Ok) get("#OK").onclick = params.Ok;
    if(params.Yes) get("#YES").onclick = params.Yes;
    if(params.No) get("#NO").onclick = params.No;
    if(params.Cancel) get("#CANCEL").onclick = params.Cancel;
    if(params.type=="prompt") {
        get("#PROMPT").focus();
    }
}

function Alert(msg,title,ok = function(){closefw()}) {
    openfw({msg:msg,title:title,Ok:ok,buttons:"ok"});
}

function AddURL() {
    openfw({msg:"Введите URL, который хотите запретить:",title:"Запретить URL",type:"prompt",buttons:"ok-cancel",Cancel:closefw,Ok:function(){
        var url = get("#PROMPT").value;
        if(!strweight(url)) {
            Alert("Введён неверный URL.","Ошибка!");
            return;
        }
        SendRequest({request:"ADD_DOMAIN",value:url},function(data) {
            if(data.success) {
                Alert("URL успешно добавлен.","Успех!");
            }
            else {
                Alert("Произошла ошибка, URL не добавлен.","Ошибка!");
            }
        });
    }});
}

/////Кнопки//////
get("CLEAR").onclick = ClearHistory;
get("UPDATE").onclick = UpdateHistoryList;
get("ENABLE").onclick = ToggleEnabled;
get("ADD-URL").onclick = AddURL;


UpdateHistoryList();
GetEnabled();

ConnectPort.onMessage.addListener(MessageRecieved);

get("#main-content").classList.add("appear");
