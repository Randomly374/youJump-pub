//-----------------------------------onInstalledListener: this listener is here to disable the extension on pages not under youtube DOM.
chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostEquals: 'www.youtube.com' },
            })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});
//---------------------------------------START OF GLOBAL VARIABLES------------------------------------------------------------------------------

var firstCheck = true;  //------ Flag which checks if the onHeadersRecived Listener activated for the first time, where url is of a video.
var currentUrl = "";    //------- Stores the current video url up until the first &.
var response = {time:"abc",desc:""};    //------- Gets the start time from the database (start time only).
var phpInsert = "http://localhost/youjumpphp/YJInsert.php"; //------ Address of the php page which inserts to the main database.
var phpSelect = "http://localhost/youjumpphp/YJSelect.php"; //------ Address of the php page which finds and selects the data from the database.
var phpDelete = "http://localhost/youjumpphp/YJDelete.php"; //------ Address of the php page which deletes the data from the database.
var phpPersonalDBSelect = "http://localhost/youjumpphp/YJPDBSelect.php"; //------ Address of the php page which selects the personal time info of the specific user.
var phpPersonalDBInsert = "http://localhost/youjumpphp/YJPDBInsert.php"; //------ Address of the php page which inserts new info into the personal database of the specific user.
var phpUserDBCreate = "http://localhost/youjumpphp/YJUDBCreate.php"; //------ Address of the php page which creates a new user, and new user database.
var phpUserDBSelect = "http://localhost/youjumpphp/YJUDBSelect.php"; //------ Address of the php page which finds if the user exists and if so gives the personal info of that user.
var userName = "";  //------- The current user databaseName;
var userFlag = false;//------ Flag which indicates whether times are for a user or not;
var globalStrips = { time: "", desc: "", start: "" };   //-- Contains the data gathered from the main database: times, descriptions and startRating.
var popupTimeString = { time: "", desc: "", start: "" };   //-- Contains the data which is sent to the popup.
var personalStrips = { time: "", desc: "", arrLikes: [], start: "" };  //-- If the user is logged into a personal database this saves his personal info.
var tabId = -1; //------ The Id of the current tab.
var threshold = -3; //------ The minimum like/dislike rating for a time before deletion.
var arrLikes = [];  //------ An array of {-1, 0, 1}. Size of times in video. Represents the like/dislike picking of the current viewer.
var maxStart = 0;   //---- Value out of {0, 1}. This number is a flag for if the startRating of the times in the video is different, indicating
                    //---- if to sort the first time or ignore it's placement (the first time is sorted by start Rating normally).
var listFlag = false;   //------ Flag which indicates if the video is a part of a list.
var BFFlag = false; //---- Back Forward Flag. Indicates if the video is a result of history state change, in case of video being part of a list.
var startClicked = 0;   //------ Indicates the start time picked by the user, defaults to 0.
var refreshFlag = false;    //------ Flag indicating whether to refresh at sendToDB insert complete momment.
var messageRecived = false; //---- Flag which indicates if the message $-7 from tabId tab was already sent, useful if the message keeps sending.
var tmpFlag = false;    //----- Flag for if LikesGiveAndTake isn't on the right tabId.

//-----------------------------------------END OF GLOBAL VARIABLES------------------------------------------------------------------------------

//-------------------------tabs.onActivatedListener: This listener gets the tabId of the current tab, as well as gets the info from the database
//-------------------------and gets info to content.js page. All info gotten other then tabId is contingent on page being a video.
chrome.tabs.onActivated.addListener(function (activeInfo) {
    tabId = activeInfo.tabId;
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        if (tab.url.startsWith("https://www.youtube.com/watch?v=")) {
            var str = tab.url.split("&");
            findIfList(str);
            currentUrl = str[0];
            getFromDB(activeInfo.tabId);
            likesGiveAndTake(activeInfo.tabId);
        } else { currentUrl = "-1"; }
    });
});


//-------------------------likesGiveAndTake: Builds the arrLikes from content.js or sends the likes chosen to content.js. Third option is reset
//-------------------------both arrLikes here and on content.js.
function likesGiveAndTake(tabId) {
    chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (tabs) {
        tabId = tabs[0].id;
    });
    if (tabId === -1) {
        chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (tabs) {
            tabId = tabs[0].id;
            likesGiveAndTake(tabId);
        });
    } else {
        tmpFlag = false;
        chrome.tabs.sendMessage(tabId, "$-2", function (response) {
            if (response === "-1") {
                if (popupTimeString.time != "") {
                    var str2 = popupTimeString.time.split("~");
                    var i;
                    for (i = 0; i < str2.length - 1; i++) {
                        if (!userFlag) {
                            arrLikes[i] = 0;
                            chrome.tabs.sendMessage(tabId, "$-4^" + i + "^0");
                        } else {
                            chrome.tabs.sendMessage(tabId, "$-4^" + i + "^" + arrLikes[i]);
                        }
                    }
                    if (!userFlag) {
                        startClicked = 0;
                        chrome.tabs.sendMessage(tabId, "$-8^0");
                    } else {
                        chrome.tabs.sendMessage(tabId, "$-8^" + startClicked);
                    }
                }
            } else if (!response) {
                console.log("no arrLikes in contentPage");
            } else {
                var i;
                for (i = 0; i < response.length; i++) {
                    arrLikes[i] = response[i];
                }
                chrome.tabs.sendMessage(tabId, "$-9", function (info) {
                    startClicked = info;
                });
            }
        });
    }
}

//-------------------runtime.onMessageListener: Handler of all messages sent to background.js
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (!request.response) {                                    //safety check.
        alert("problem with request");
    } else {
        if (request.response === "$-1") {//$-1:Message from popup.js, meaning "Go", or "sender", is clicked, adding new times or changing
            refreshFlag = true;          //    start ratings.
            sendToDB(tabId,request);                                   
        } else if (request.response === "$-2") {//$-2:  Message from popup.js, this message Builds the popup.js. Sends all needed info back.
            if (request.a == "1") {
                var pack = { time: popupTimeString.time, desc: popupTimeString.desc, start: popupTimeString.start, arrL: arrLikes, startClicked: startClicked , userName: userName};
                sendResponse(pack);
            } else {
                if (currentUrl != "-1") {
                    if (tabId === -1) {
                        chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (tabs) {
                            tabId = tabs[0].id;
                            var str1 = tabs[0].url.split("&");
                            currentUrl = str1[0];
                            getFromDB(tabs[0].id);
                            sendInfoToPopup(request, sender, sendResponse);
                        });
                    } else {
                        sendInfoToPopup(request, sender, sendResponse);
                    }
                } else {
                    var pack = { time: "-2", desc: "", start: "", arrL: [], startClicked: 0 , userName: userName};
                    sendResponse(pack);
                }
            }
        } else if (request.response === "$-4") {//$-4:  Message from popup.js, like/dislike was pressed. Updates the database.
            sendToDB(tabId,request);                                  
        } else if (request.response === "$-5") {//$-5:  Message from popup.js, like/dislike was pressed. Updates content.js and this arrLikes 
            chrome.tabs.sendMessage(tabId, "$-4^" + request.timeStrip + "^" + request.descStrip);// and time data.
            arrLikes[request.timeStrip] = request.descStrip;
        }else if(request.response === "$-6"){//$-6: Message from popup.js, calls to update the arrLikes of background.js, updates entire array.
            updateArrLikes(request);
        } else if (request.response === "$-7") {//$-7:  Message from content.js, in case of list, start time=0, and historystatechange, sends
            if (!messageRecived) {              //      the start time to content.js.
                messageRecived = true;
                var tmp1 = response.time.split(":");
                if (listFlag || tmp1[0] === "0" || BFFlag) {
                    BFFlag = false;
                    if (tmp1[0] != "-1") {
                        sendResponse(tmp1[0]);
                    } else {
                        sendResponse("-1");
                    }
                }
            } else {
                messageRecived = false;
            }
        } else if (request.response === "$-8") {//$-8:  Message from popup.js, sends back tabId in order for popup.js to contact content.js.
            if (tabId === -1) {
                chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (tabs) {
                    tabId = tabs[0].id;
                    sendResponse(tabId);
                });
            } else {
                sendResponse(tabId);
            }
        } 
        else if (request.response === "$-11" || request.response === "$-12") {//$-11, $-12: Message from content.js to popup.js, ignored here.
            return true;
        } else if (request.response === "$-13") {//$-13: Message from popup.js, input user name.
            getUserFromDB(request);
        } else if (request.response === "$-14") {//$-14: Message from popup.js, adding new user to userDB.
            addUserToDB(request);
        } else {                                                  //$-3 is in this category, on timeButton pressed, sends time to content.js.
            chrome.tabs.sendMessage(tabId, request.response);
        }
    }
});
//-------- sendInfoToPopup: Gets info from content.js, if no content.js refreshes, and sends the info to popup.js. Info is the general info for
//--------                  a video. Called from runtime.message $-2.
function sendInfoToPopup(request, sender, sendResponse) {
    likesGiveAndTake(tabId);
    chrome.tabs.sendMessage(tabId, "$-5", function (info) {
        if (!info) {
            chrome.tabs.reload(tabId);
            console.log("refreshing window");
            chrome.runtime.sendMessage({ response: "$-11" });
        } else {
            popupTimeString.time = info.time;
            popupTimeString.desc = info.desc;
            popupTimeString.start = info.start;
            startClicked = info.startClicked;
            //alertPopup("$-5 in sendInfoToPopup");
        }
    });
    var pack = { time: popupTimeString.time, desc: popupTimeString.desc, start: popupTimeString.start, arrL: arrLikes, startClicked: startClicked , userName: userName};
    sendResponse(pack);
}
//-------- getUserFromDB: Finds if a user with username and password is in the database and sets username to him, also userFlag is true.
function getUserFromDB(request) {
    var tmp1 = request.userName + "&" + request.password;
    var vars = tmp1;
    var httpusel = new XMLHttpRequest();
    httpusel.open("POST", phpUserDBSelect, true);
    httpusel.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var tmp = this.responseText;
            if (tmp === "-1") {
                alert("invalid password, please enter the correct password.");
            } else if (tmp === "-2") {
                alert("user not found in db.");
            } else {
                alert("hello "+tmp);
                userFlag = true;
                userName = request.userName;
                chrome.tabs.reload(tabId);
                chrome.runtime.sendMessage("$-11");
            }
        }
    }
    httpusel.send(vars);
}
//-------- addUserToDB: Inserts new user to userDB, also creates new personaluserDB for said user.
function addUserToDB(request) {
    var tmp1 = request.userName + "&" + request.password;
    var vars = tmp1;
    var httpuins = new XMLHttpRequest();
    httpuins.open("POST", phpUserDBCreate, true);
    httpuins.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var tmp = this.responseText;
            if (tmp === "-1") {
                alert("username already taken, please try another");
            } else if (tmp === "-2") {
                alert("error in database insert");
            } else if (tmp === "-3") {
                alert("problem with new db");
            }
            else {
                alert("user entered successfully");
                userFlag = true;
                userName = request.userName;
                chrome.tabs.reload(tabId);
                chrome.runtime.sendMessage("$-11");
            }
        }
    }
    httpuins.send(vars);
}

//-------- updateArrLikes: Gets the entire arrLikes from popup.js and rebuilds the background.js arrLikes. called from runtime.message $-6.
function updateArrLikes(request,sender,sendResponse) {
    var str1 = request.timeStrip.split("~");
    var i;
    for (i = 0; i < request.arrL.length; i++) {
        arrLikes[i] = request.arrL[i];
    }
    for (i = i; i < str1.length - 1; i++) {
        arrLikes[i] = 0;
    }
}
//-------- combineTimes: combines both global database times and personal times into a single strips.
function combineTimes() {
    var i, j;
    var foundInPDB = false;
    var newTimeStrip = "";
    var newDescStrip = "";
    var newStartStrip = "";
    if (!userFlag || (!personalStrips.time || !personalStrips.desc || !personalStrips.start)) {
        personalStrips.time = "0";
        personalStrips.desc = "0";
        personalStrips.start = "0";
    }
    var UDBTime = personalStrips.time.split("~");
    var GDBTime = globalStrips.time.split("~");
    var UDBDesc = personalStrips.desc.split("~");
    var GDBDesc = globalStrips.desc.split("~");
    var PDBStart = personalStrips.start.split("~");
    var GDBStart = globalStrips.start.split("~");
    for(i = 0; i < GDBTime.length - 1; i++){
        var Gtmp = GDBTime[i].split(":");
        foundInPDB = false;
        for (j = 0; j < UDBTime.length - 1; j++){
            var Utmp = UDBTime[j].split(":");
            if (Gtmp[0] === Utmp[0] && GDBDesc[i] === UDBDesc[j]) {
                newTimeStrip += GDBTime[i] + ":" + Utmp[2] + "~";
                newDescStrip += GDBDesc[i] + "~";
                newStartStrip += GDBStart[i] + "~";
                arrLikes[i] = personalStrips.arrLikes[j];
                chrome.tabs.sendMessage(tabId, "$-4^" + i + "^" + arrLikes[i]);
                foundInPDB = true;
                if (Utmp[2] === "2") {
                    startClicked = i;
                }
                break;
            }
        }
        if (!foundInPDB) {
            if (i === 0 && UDBTime.length === 1) {
                newTimeStrip += GDBTime[i] + ":2~";
                startClicked = 0;
            } else {
                newTimeStrip += GDBTime[i] + ":0~";
            }
            newDescStrip += GDBDesc[i] + "~";
            newStartStrip += GDBStart[i] + "~";
            arrLikes[i] = 0;
            chrome.tabs.sendMessage(tabId, "$-4^" + i + "^0");
        }
    }
    if (newTimeStrip.length === 0) {
        popupTimeString.time = "-1";
        popupTimeString.desc = "-1";
        popupTimeString.start = "-1";
    } else {
        popupTimeString.time = newTimeStrip;
        popupTimeString.desc = newDescStrip;
        popupTimeString.start = newStartStrip;
        chrome.tabs.sendMessage(tabId, "$-6^" + popupTimeString.time + "^" + popupTimeString.desc + "^" + popupTimeString.start);
        chrome.tabs.sendMessage(tabId, "$-8^" + startClicked);
    }
    //alertPopup("combineTimes");
}
//-------- alertPopup: Dumps popuptimeStrip values, arrLikes values and startClicked value.
function alertPopup(funcName) {
    console.log("function name: " + funcName + "\nuserFlag: " + userFlag + "\ntime strip: " + popupTimeString.time + "\ndescription: " +
        popupTimeString.desc + "\nstart: " + popupTimeString.start + "\narrLikes: " + arrLikes + "\nstartclicked: " + startClicked);
}

//-------- sortByUserPrefrence: Sorts the strips by user prefrence, meaning by :----1) userStartTime;
                                                                                //--2) userLikedTimes and UserEnteredTimes;
                                                                                //--3) likes;
                                                                                //--4) chronological;
function sortByUserPreference() {
    var i, j;
    var timeArr = popupTimeString.time.split("~");
    var descArr = popupTimeString.desc.split("~");
    var startArr = popupTimeString.start.split("~");
    var sortedTime = "";
    var sortedDesc = "";
    var sortedStart = "";
    for (i = 0; i < timeArr.length - 1; i++) {
        for (j = i; j < timeArr.length - 1; j++) {
            var str1 = timeArr[i].split(":");
            var str2 = timeArr[j].split(":");
            if (str1[2] < str2[2]) {
                switchAll([timeArr, descArr, startArr, arrLikes], i, j);
            } else if (str1[2] === str2[2]) {
                if (str1[1] < str2[1]) {
                    switchAll([timeArr, descArr, startArr, arrLikes], i, j);
                } else if (str1[1] === str2[1]) {
                    if (str1[0] > str2[0]) {
                        switchAll([timeArr, descArr, startArr, arrLikes], i, j);
                    }
                }
            }
        }
    }
    for (i = 0; i < timeArr.length - 1; i++) {
        sortedTime += timeArr[i] + "~";
        sortedDesc += descArr[i] + "~";
        sortedStart += startArr[i] + "~";
    }
    if (sortedTime.length === 0) {
        popupTimeString.time = "-1";
        popupTimeString.desc = "-1";
        popupTimeString.start = "-1";
    } else {
        popupTimeString.time = sortedTime;
        popupTimeString.desc = sortedDesc;
        popupTimeString.start = sortedStart;
        response.time = sortedTime;
        chrome.tabs.sendMessage(tabId, "$-6^" + popupTimeString.time + "^" + popupTimeString.desc + "^" + popupTimeString.start);
        chrome.tabs.sendMessage(tabId, "$-8^" + startClicked);
        updateContentLikes(tabId);
    }
    //alertPopup("sortByUserPreference");
}
//-------- proccessStrip:  Removes the third value from the array which is sent to the global database.
//         Example: time "60:1:1", meaning 1 minute, likeRating of 1, and liked/entered by the user turns into "60:1" in popupTimeStrip.time,
//                  and stays the same for personalStrips.
function proccessStrip(strips) {
    var i;
    var newPopupTimeStrip = "";
    var timeArr = strips.timeStrip.split("~");
    for (i = 0; i < timeArr.length - 1; i++) {
        var tmp1 = timeArr[i].split(":");
        newPopupTimeStrip += tmp1[0] + ":" + tmp1[1] + "~";
    }
    strips.timeStrip = newPopupTimeStrip;
}
//-------- buildPersonalArrLikes: Turns arrLikes into a string by adding ~;
function buildPersonalArrLikes() {
    var newArrLikesString = "";
    var i;
    for (i = 0; i < arrLikes.length - 1; i++) {
        newArrLikesString += arrLikes[i] + "~";
    }
    newArrLikesString += arrLikes[i];
    return newArrLikesString;
}
//-------- getFromPersonalDB:  Gets the current user's personal info regarding this video.
function getFromPersonalDB() {
    var vars = currentUrl + "&" + userName;
    var httppsel = new XMLHttpRequest();
    httppsel.open("POST", phpPersonalDBSelect, true);
    httppsel.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var tmp = this.responseText.split("$");
            personalStrips.time = tmp[0];
            personalStrips.desc = tmp[1];
            personalStrips.start = tmp[2];
            if (tmp[0] != -1 && tmp[0]!="error in db") {
                var likes = tmp[3].split("~");
                personalStrips.arrLikes = likes;
            }
        }
    }
    httppsel.send(vars);
}
//-------- getFromDB:   Gets the info of a video from the main database, if not found globalStrips.time=-1. Also builds content.js.
//--------              Called from various listeners.
function getFromDB(tbid) {
    if (userFlag) {
        getFromPersonalDB();
    }
    var vars = "url=" + currentUrl;
    var httpsel = new XMLHttpRequest();
    httpsel.open("POST", phpSelect, true);
    httpsel.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    httpsel.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var tmp = this.responseText.split("$");
            globalStrips.time = tmp[0];
            globalStrips.desc = tmp[1];
            globalStrips.start = tmp[2];
            combineTimes();
            if (userFlag) {
                sortByUserPreference();
            }
            else {
                response.time = tmp[0];
                chrome.tabs.sendMessage(tbid, "$-6^" + tmp[0] + "^" + tmp[1] + "^" + tmp[2]);
            }
        }
    }
    httpsel.send(vars);
}
//--------- updateContentLikes: Sends the entire arrLikes to content.js. called from sendToDB.
function updateContentLikes(tabId) {
    var i;
    for (i = 0; i < arrLikes.length; i++) {
        chrome.tabs.sendMessage(tabId, "$-4^" + i + "^" + arrLikes[i]);
    }
}
//-------- deleteFromDB:   Deletes line from main database via phpDelete address. called from sendToDB in case of no info for video.
function deleteFromDB(url) {
    var vars = "url=" + url;
    var httpc = new XMLHttpRequest();
    httpc.open("POST", phpDelete, true);
    httpc.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    httpc.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
        }
    }
    httpc.send(vars);
}
//------- sendToPersonalDB: Creates or Updates info for the currentUrl in the personal database of the current user.
//-------                   Happens after sortByUserPreference function is called.
function sendToPersonalDB() {
    var newArrLikes = buildPersonalArrLikes();
    var vars = userName + "&" + currentUrl + "&" + personalStrips.time + "&" + personalStrips.desc + "&" + personalStrips.start + "&" + newArrLikes;
    var httppersonalc = new XMLHttpRequest();
    httppersonalc.open("POST", phpPersonalDBInsert, true);
    httppersonalc.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    httppersonalc.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
        }
    }
    httppersonalc.send(vars);
}

//------- sendToDB:    Creates new url info in database, or updates info for the given url via phpInsert. Proccesses the info first like sorting
//-------              by likes, deleting low rating times, and finding start time. Called from runtime.message $-1, $-4.
function sendToDB(tabId, request, sender, sendResponse) {
    arrLikes = request.arrLikes;
    startClicked = request.oldInputStartIndex;
    maxStart = 0;
    checkForLikes(request);
    if (userFlag) {
        popupTimeString.time = request.timeStrip;
        popupTimeString.desc = request.descStrip;
        popupTimeString.start = request.start;
        //alertPopup("sendToDB before sendToPersonalDB");
        arrLikes = request.arrLikes;
        sortByUserPreference();
        personalStrips.time = popupTimeString.time;
        personalStrips.desc = popupTimeString.desc;
        personalStrips.start = popupTimeString.start;
        personalStrips.arrLikes = arrLikes;
        sendToPersonalDB();
        chrome.tabs.sendMessage(tabId, "$-6^" + personalStrips.time + "^" + personalStrips.desc + "^" + personalStrips.start);
        updateContentLikes(tabId);
        chrome.tabs.sendMessage(tabId, "$-8^" + startClicked);
    }
    proccessStrip(request);
    arrLikes = request.arrLikes;
    findStart(request);
    if (!request.timeStrip) {
        console.log("all times were deleted");
        deleteFromDB(currentUrl);                                                                //here we need to delete the url from the DB!!!
    } else {
        sortResult(request);
        globalStrips.time = request.timeStrip;
        globalStrips.desc = request.descStrip;
        globalStrips.start = request.start;
        if (!userFlag) {
            chrome.tabs.sendMessage(tabId, "$-6^" + request.timeStrip + "^" + request.descStrip + "^" + request.start);
            updateContentLikes(tabId);
            chrome.tabs.sendMessage(tabId, "$-8^" + startClicked);
        }
        console.log("sending to DB");
        var tmpUrlFix = currentUrl + "&t=" + globalStrips.time + "&des=" + globalStrips.desc + "&start=" + globalStrips.start;
        var vars = "url=" + tmpUrlFix;
        var httpc = new XMLHttpRequest();
        httpc.open("POST", phpInsert, true);
        httpc.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        httpc.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                console.log(this.responseText);
                if (refreshFlag) {
                    refreshFlag = false;
                    chrome.tabs.reload(tabId);
                }
            }
        }
        httpc.send(vars);
    }
}
//------- checkForLikes:    Removes times where the likes are less then the variable threshold. Called from sendToDB.
function checkForLikes(result) {
    var tmp1 = result.timeStrip.split("~");
    var tmp2 = result.descStrip.split("~");
    var tmp4 = result.start.split("~");
    var i;
    var str1 = "";
    var str2 = "";
    var str3 = "";
    for (i = 0; i < tmp1.length - 1; i++) {
        var tmp3 = tmp1[i].split(":");
        if (+tmp3[1] >= +threshold) {
            str1 += tmp1[i] + "~";
            str2 += tmp2[i] + "~";
            str3 += tmp4[i] + "~";
        } else {
            if (startClicked == i) {
                startClicked = 0;               
            }
            removeArrLikes(i);
        }
    }
    result.timeStrip = str1;
    result.descStrip = str2;
    result.start = str3;
}
//--- removeArrLikes:   In case of time removed due to low rating, updates the arrLikes and the startClicked if needed. Called by checkForLikes.
function removeArrLikes(index) {
    var i=index;
    for (i = index; i < arrLikes.length - 1; i++) {
        if (startClicked == i) {
            startClicked++;
        }
        arrLikes[i] = arrLikes[i+1];
    }
    arrLikes[i] = 0;
}

//sortResult:    Sorts the times for the url by order of importence: 1)start.
//               Called by sendToDB.                                 2)likes.
//                                                                   3)time.
function sortResult(result) {                           
    var tmp1 = result.timeStrip.split("~");
    var tmp2 = result.descStrip.split("~");
    var start = result.start.split("~");
    var i, j;
    var str1 = "";
    var str2 = "";
    var str3 = "";
    for (i = maxStart; i < tmp1.length - 1; i++) {
        for (j = i; j < tmp1.length - 1; j++) {
            var tmp3 = tmp1[i].split(":");
            var tmp4 = tmp1[j].split(":");
            if (+tmp3[1] < +tmp4[1]) {
                switchAll([tmp1, tmp2, start, arrLikes], i, j);
            } else if (+tmp3[1] == +tmp4[1]) {
                if (+tmp3[0] > +tmp4[0]) {
                    switchAll([tmp1, tmp2, start, arrLikes], i, j);
                }
            }
        }
    }
    for (i = 0; i < tmp1.length - 1; i++) {
        str1 += tmp1[i] + "~";
        str2 += tmp2[i] + "~";
        str3 += start[i] + "~";
    }
    result.timeStrip = str1;
    result.descStrip = str2;
    result.start = str3;
}
//------ switchOne: Switches between two indexes of an array. Called from switchAll.
function switchOne(arr, index1, index2) {
    var tmp1 = arr[index1];
    arr[index1] = arr[index2];
    arr[index2] = tmp1;
}
//------ switchAll: Switches between two indexes of an array, for each array in arr.Called by various.
function switchAll(arr, index1, index2) {
    if (startClicked == index2) {
        startClicked = index1;
    } else if (startClicked == index1) {
        startClicked = index2;
    }
    var i;
    for (i = 0; i < arr.length; i++) {
        switchOne(arr[i], index1, index2);
    }
}
//------ findStart: Finds the new start, set by start rating, and puts it first. Called by sendToDB.
function findStart(result) {                        
    var tmp1 = result.timeStrip.split("~");
    var tmp2 = result.descStrip.split("~");
    var tmp3 = result.start.split("~");
    var str1 = "";
    var str2 = "";
    var str3 = "";
    var maxStartRating = +tmp3[0];
    var i;
    for (i = 0; i < tmp1.length - 1; i++) {
        if (maxStartRating != +tmp3[i]) {
            maxStart = 1;
        }
        if (+tmp3[i] > +maxStartRating) {
            maxStartRating = tmp3[i];
            switchAll([tmp1, tmp2, tmp3, arrLikes], 0, i);
        }
    }
    for (i = 0; i < tmp1.length - 1; i++) {
        str1 += tmp1[i] + "~";
        str2 += tmp2[i] + "~";
        str3 += tmp3[i] + "~";
    }
    result.timeStrip = str1;
    result.descStrip = str2;
    result.start = str3;
}
//findIfList:   Finds out if the current video is a part of a playlist. Variable str is an array of a url string split by "&". Called by various.
function findIfList(str) {
    var i;
    var flag = false;
    for (i = 0; i < str.length; i++) {
        var tmp = str[i].split("=");
        if (tmp[0] === "list") {
            listFlag = true;
            flag = true;
            return;
        }
    }
    if (!flag) {
        listFlag = false;
    }
}
//---- webRequest.onBeforeSendHeadersListener:  If new url is a video, gets start time from the main database. Also calls likesGiveAndTake
//----                                          if url is the same, in order to save the arrLikes from content.js.
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        if (details.url.startsWith("https://www.youtube.com/watch?")) {
            messageRecived = false;
            var str = details.url.split("&");
            findIfList(str);
            var userHasUrl = false;
            if (userFlag) {
                var vars = str[0] + "&" + userName;
                var httppsel2 = new XMLHttpRequest();
                httppsel2.open("POST", phpPersonalDBSelect, true);
                httppsel2.onreadystatechange = function () {
                    if (this.readyState == 4 && this.status == 200) {
                        var tmp = this.responseText.split("$");
                        if (tmp[0] != "-1" && tmp != "error in db") {
                            personalStrips.time = tmp[0];
                            personalStrips.desc = tmp[1];
                            personalStrips.start = tmp[2];
                            var likes = tmp[3].split("~");
                            personalStrips.arrLikes = likes;
                            userHasUrl = true;
                            response.time = tmp[0];
                        }
                    }
                }
                httppsel2.send(vars);
            }
            var vars = "url=" + str[0];
            var httpsel = new XMLHttpRequest();
            httpsel.open("POST", phpSelect, true);
            httpsel.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            httpsel.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var tmp = this.responseText.split("$");
                    if (!userHasUrl) {
                        response.time = tmp[0];
                    }
                }
            }
            httpsel.send(vars);
            if (currentUrl === str[0]) {
                likesGiveAndTake(details.tabId);
            }
        }
},
{urls:["https://www.youtube.com/*"]}
);
//---- removeT: Removes the &t= from the array given. Called by webRequest.onHeadersRecived Listener.
function removeT(str) {
    var tmp1 = str.split("&");
    var retStr=tmp1[0];
    var i;
    for (i = 1; i < tmp1.length; i++) {
        var tmp2 = tmp1[i].split("=");
        if (tmp2[0] != "t") {
            retStr += "&" + tmp1[i];
        }
    }
    return retStr;
}
//---- webRequest.onHeadersRecivedListener: If url is video, first time checking and video isn't a list, redirects to the url with the time got.
chrome.webRequest.onHeadersReceived.addListener(
	function (details)
	{
	    if (details.url.startsWith("https://www.youtube.com/watch?") && firstCheck && !listFlag) { //add afterSubmitFlag when false, change to original url
	        firstCheck = false;
	        if (response.time === "-1") {
	            console.log("not found");
	            return {};
	        }else if(response.time === "abc"){
	            console.log("didn't getFromDB");
	            return { redirectUrl: details.url };
	        }
	        else {
	            str = details.url.split("&");
	            var tmp = response.time.split(":");
	            if (tmp[0] === "-1") {
	                return {};
	            }
	            if (tmp[0] == 0) {
	                return {redirectUrl: removeT(details.url)};
	            }
	            var urlStr=removeT(details.url);
	            var tmpUrlFix = urlStr + "&t=" + tmp[0];
	            response.time = "abc";
	            return { redirectUrl: tmpUrlFix };
	            }
	        }
	    },
	{ urls: ["https://www.youtube.com/*"] },
	["blocking"]
);
//------ webRequest.onCompletedListener:    Resets firstCheck. If url is video gets info from DB, rebuilds arrLikes both here and content.js.
//---- If same url as before, does the same but doesn't rebuild arrLikes in content.js, instead rebuilds this arrLikes with content.js arrLikes.
chrome.webRequest.onCompleted.addListener(function (details) {
    firstCheck = true;
    if (details.url.startsWith("https://www.youtube.com/watch?")) {
            var str = details.url.split("&");
            if (currentUrl != str[0]) {
                currentUrl = str[0];
                getFromDB(details.tabId);
                if (popupTimeString.time != "") {
                    var str2 = popupTimeString.time.split("~");
                    var i;
                    for (i = 0; i < str2.length - 1; i++) {
                        if (!userFlag) {
                            arrLikes[i] = 0;
                            chrome.tabs.sendMessage(details.tabId, "$-4^" + i + "^0");
                        }
                        else {
                            chrome.tabs.sendMessage(details.tabId, "$-4^" + i + "^" + arrLikes[i]);
                        }
                    }
                }
            } else {
                getFromDB(details.tabId);
                chrome.tabs.sendMessage(details.tabId, "$-2", function (response) {
                    if (response === "-1") {
                        if (popupTimeString.time != "") {
                            var str2 = popupTimeString.time.split("~");
                            var i;
                            for (i = 0; i < str2.length - 1; i++) {
                                if (!userFlag) {
                                    if (!arrLikes[i]) {
                                        arrLikes[i] = 0;
                                    }
                                }
                                chrome.tabs.sendMessage(details.tabId, "$-4^" + i + "^" + arrLikes[i]);
                            }
                            chrome.tabs.sendMessage(details.tabId, "$-8^" + startClicked);
                        }
                    } else if (!response) {
                        console.log("no response");
                    }
                });
            }
        }
},
{urls:["https://www.youtube.com/*"]}
);
//---- tabs.onUpdatedListener:  Listens for url changes in tab update, mainly used for historystatechange.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.url.startsWith("https://www.youtube.com/watch?")) {
        if (changeInfo.url) {
            messageRecived = false;
            BFFlag = true;
            var str1 = changeInfo.url.split("&");
            currentUrl = str1[0];
            findIfList(str1);
            getFromDB(tabId);
            likesGiveAndTake(tabId);
        }
    } else {
        currentUrl = "-1";
    }
});