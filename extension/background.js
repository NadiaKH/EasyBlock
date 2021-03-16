var Enabled = true;
var ConnectPort;
var BlockHistory = [];
var UserDomains = [];

function GetUserDomains() {
    var userdomains = localStorage.getItem("user-domains");
    if(!userdomains) return;
    UserDomains = JSON.parse(userdomains);
}

function SaveUserDomains() {
    localStorage.setItem("user-domains",JSON.stringify(UserDomains));
}

function Send(data) {
    ConnectPort.postMessage(data);
}

function ProcessData(data) {
    console.log("Полученная информация: " + JSON.stringify(data));
    var req = data.request;
    if(req == "GET_ENABLED") {
        return {value:Enabled};
    }
    else if(req == "GET_HISTORY") {
        return {value:BlockHistory};
    }
    else if(req == "CLEAR_HISTORY") {
        BlockHistory = [];
        return {success:true};
    }
    else if(req == "SET_ENABLED") {
        Enabled=data.value;
        return {success:true};
    }
    else if(req == "REMOVE_DOMAIN") {
        if(BadDomains.includes(data.url)) {
            var id = BadDomains.indexOf(data.url);
            if (id > -1) 
                BadDomains.splice(id, 1);
        }
        else if(UserDomains.includes(data.url)) {
            var id = UserDomains.indexOf(data.url);
            if (id > -1) {
                UserDomains.splice(id, 1);
                SaveUserDomains();
            }
        }
        else return {success:false};
        for(var a = BlockHistory.length-1;a>=0;a-=1) {
            if(BlockHistory[a].url == data.url)
                BlockHistory.splice(a,1);
        }
        return {success:true};
    }
    else if(req == "ADD_DOMAIN") {
        var url = data.value;
        if(Forbidden(url)) return {success:false};
        UserDomains.push(url);
        SaveUserDomains();
        return {success:true};
    }
}

function ClearUserDomains() {
    UserDomains = [];
    SaveUserDomains();
}

function Connected(p) {
    ConnectPort = p;
    console.log("Присоединение! Имя: " + p.name);
    ConnectPort.onMessage.addListener(function(data) {
        var data2 = ProcessData(data);
        console.log("Отправляемая информация: " + JSON.stringify(data2));
        Send(data2);
    });
    
}
chrome.runtime.onConnect.addListener(Connected);


function Forbidden(url) {
    if(UserDomains.includes(url) || BadDomains.includes(url)) return true;
    return false;
} 

var BadDomains = [
    "doubleclick.com",
    "mc.yandex.ru",
    "google-analytics.com",
    "an.yandex.ru",
    "reklama.ngs.ru",
    "github.githubassets.com",
    "yandex.ru"
];

function leetRequestFilter(details) {
    if(!details || !Enabled) return {cancel:false};
    const url = new URL(details.url);
    const block = Forbidden(url.host);
    console.log("Запрос: " + url.host);
    if (block) {
        console.log("Заблокировано!");
        //Добавление в историю
        var last = BlockHistory.length - 1;
        if(BlockHistory.length > 0 && BlockHistory[last].url == url.host) {
            BlockHistory[last].count+=1;
        }
        else {
            BlockHistory.push({url:url.host,count:1});
            if(BlockHistory.length > 20) BlockHistory.shift();
        }
    }
    return {cancel:block};
}

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        return leetRequestFilter(details);
    },
    {urls : ["http://*/*", "https://*/*"]},
    ["blocking"]
)

GetUserDomains();