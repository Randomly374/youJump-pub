

//-------------------------------------------------------------------GLOBAL VARIABLES-----------------------------------------------------------
var tmp = "";   //------ Variable used to transfer data to functions which can't have variables.
var timeMaxLength = "2";    //------ Constent maxLength for time inputs.
var descriptionMaxLength = "100";   //------ Constent maxLength for description.
var ok = "url(/images/like.png);";    //------ Constent location of like idle image.
var okclicked = "url(/images/likeclicked.png);";  //------ Constent location of like clicked image. 
var wrong = "url(/images/dislike.png);";  //------ Constent location of dislike idle image.
var wrongclicked = "url(/images/dislikeclicked.png);";    //------ Constent location of dislike clicked image.
var newInputStartIndex = -1;    //------ Indicates which new input was marked as start, -1 if an old input is marked as start.
var changeFlag = false; //------ Indicates if changeStart button is clicked.
var oneOff = true;  //------ Flag which if true, and changeStart is pressed, adds a single newInput div after current start time.
var videoLength;    //------ Stores the video length;
var DESC_SIZE = 100; //------ Set value of description shown without cursing over.
//----------------------------------------------------------------GLOBAL VARIABLES END----------------------------------------------------------
var app = {
    counter: 0,         //------ Counts the number of time buttons.
    result: { timeStrip: "", descStrip: "", response: "", start: "", oldInputStartIndex: 0, arrLikes: [], },//-- Video info strips. OISI is for which start user picked.
    $Time: {},          //------ Stores the div of +time and sender buttons.
    $sender: {},        //------ Stores sender button.
    $addTime: {},       //------ Stores addTime button.
    $newStart: {},      //------ Stores the div of changeStart.
    $changeStart: {},   //------ Stores changeStart button.
    $newUser: {},       //------ Stores newUser button.
    $changeUser: {},    //------ Stores changeUser button.
    $userInfo: {},      //------ Stores userInfo Div.
    $userName: {},      //------ Stores userName input.
    $password: {},      //------ Stores password input.
    $submitUser: {},    //------ Stores the submitUser button.
    //---init: Initializes all app variables and gets info from background.js for result strips. Also calls building functions for time buttons.
    init: function () {
        this.$userInfo = document.getElementById("userInfo");
        this.$newUser = document.getElementById("newUser");
        this.$changeUser = document.getElementById("changeUser");
        this.$userName = document.getElementById("userName");
        this.$password = document.getElementById("password");
        this.$submitUser = document.getElementById("submitUser");
        this.$newStart = document.getElementById("newStart");
        this.$changeStart = document.getElementById("changeStart");
        this.$Time = document.getElementById("Time");
        this.$addTime = document.getElementById("addTime");
        this.$sender = document.getElementById("sender");
        this.$addTime.addEventListener("click", function () {
            getVideoLength();
            app.$sender.style.display = "inline-block";
            app.$sender.addEventListener("click", senderClick);
            newInputMaker(app.counter);
            app.counter++;
        });
        this.$newUser.onclick = newUserClick
        this.$changeUser.onclick = changeUserClick
        this.$changeStart.onclick = changeStartClick
        chrome.runtime.sendMessage({ a: "", b: "", response: "$-2" }, popupBuild);
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {//-- runtime.onMessageListener:  monitoring for $-11
            if (request.response === "$-11") {//$-11:   Message by content.js, and by background.js, for closing the popup in case of aborted,
                self.close();                 //        ended or loadedmetadata video, also in case of new user or change user successfully.
            } else {//else:     These messages are meant for background.js and therefore are ignored here.
                return true;
            }
        });
    }
};
//-------- changeUserStyles: Code for revealing userInfo and hiding userButtons.
function changeUserStyles() {
    app.$userInfo.setAttribute("style", "display: inline-block");
    app.$password.setAttribute("style", "display: inline-block");
    app.$userName.setAttribute("style", "display: inline-block");
    app.$submitUser.setAttribute("style", "display: inline-block");
    app.$newUser.setAttribute("style", "display: none");
    app.$changeUser.setAttribute("style", "display: none");
}
//-------- checkString: Checks string for '&' characters.
function checkString(string) {
    var i;
    for (i = 0; i < string.length; i++) {
        if (string[i] === "&") {
            return false;
        }
    }
    return true;
}
//-------- newUserClick: displays userInfo div and sets submitUser.onclick to submitNewUser.
function newUserClick() {
    changeUserStyles();
    app.$submitUser.onclick = submitNewUser
}
//-------- submitNewUser: Sends userName and password to background.js via $-13.
function submitNewUser() {
    var name = app.$userName.value;
    var password = app.$password.value;
    var valid = checkIfValidUserInput(name, password);
    if (valid === 0) {
        chrome.runtime.sendMessage({ response: "$-14", userName: name, password: password });
    } else if(valid === -1){
        alert("username or password missing");
    } else if (valid === 1) {
        alert("username is invalid");
    } else if (valid === 2) {
        alert("password is invalid");
    }
}
//-------- changeUserClick: displays userInfo div and sets submitUser.onclick to submitChangeUser.
function changeUserClick() {
    changeUserStyles();
    app.$submitUser.onclick = submitChangeUser
}
//-------- submitChangeUser: Sends userName and password to background.js via $-14.
function submitChangeUser() {
    var name = app.$userName.value;
    var password = app.$password.value;
    var valid = checkIfValidUserInput(name, password);
    if (valid === 0) {
        chrome.runtime.sendMessage({ response: "$-13", userName: name, password: password });
    } else if (valid === -1) {
        alert("username or password missing");
    } else if (valid === 1) {
        alert("username is invalid");
    } else if (valid === 2) {
        alert("password is invalid");
    }
}
//-------- checkIfValidUserInput: Check if the name and password entered are valid(subject to change).
function checkIfValidUserInput(name, password) {
    if (!name || !password) {
        return -1;
    } else {
        var valid = checkString(name);
        if (!valid) {
            return 1;
        } else {
            valid = checkString(password);
            if (!valid) {
                return 2;
            }
            else { return 0; }
        }
    }
}
//----------------------------popupBuild is the response from the background page of when popup is activated.
//----------------------------the function gets the time, description, start, array of likes pressed and which start was pressed in this page.
function popupBuild(pack) {
    if (!pack) { chrome.runtime.sendMessage({ a: "1", b: "", response: "$-2" }, popupBuild); return;}
        if (pack.time === "-1") {
            app.result.timeStrip = "0:0~";
            app.result.descStrip = "New video~";
            app.result.start = "1~";
            app.result.arrLikes = [0];
            app.result.oldInputStartIndex = 0;
            userNameHandler(pack.userName);
            buttonMaker("New Video Start Time", "00:00:00", 0, 0);
        }else if(pack.time ==="-2"){
            app.$Time.style.display = "none";
            app.$addTime.style.display = "none";
            app.$changeStart.style.display = "none";
            var notVid = document.createElement("h3");
            var text = document.createTextNode("page not a video");
            notVid.appendChild(text);
            document.body.appendChild(notVid);
        } else if (pack.time === "$-11") {
            self.close();
        } else {
            app.result.timeStrip = pack.time;
            app.result.descStrip = pack.desc;
            app.result.start = pack.start;
            app.result.arrLikes = pack.arrL;
            userNameHandler(pack.userName);
            app.result.oldInputStartIndex = pack.startClicked;
            buttonMakerDeluxe(pack);
        }
}
//-------- userNameHandler: Creates a text according to userName.
function userNameHandler(userName) {
    var h3 = document.createElement("h3");
    h3.id = "current_user_name";
    var text;
    if (!userName) {
        text = document.createTextNode("Hello visitor, for personal settings please log in or create new user");
        app.$changeUser.value = "log in";
    } else {
        text = document.createTextNode("Hello " + userName +",");
    }
    h3.appendChild(text);
    document.body.insertBefore(h3,app.$newStart);
}
//----------------------------when the popup is loaded this listener initiates the popup app.
document.addEventListener("DOMContentLoaded", function () {
    app.init();
});
//----------------------------buttonMakerDeluxe gets all the times and descriptions and builds buttons out of them.
function buttonMakerDeluxe(pack) {
    var i;
    var tmp1=pack.time.split("~");
    var tmp2=pack.desc.split("~");
    for (i = 0; i < tmp1.length-1; i++) {
        tmp3 = tmp1[i].split(":");
        var num = convertToTime(tmp3[0]);
        buttonMaker(tmp2[i], num, i,pack.arrL[i]);
    }
}
//----------------numIsValid checks that the time entered in the newInput is valid: only numbers, minutes and seconds 0< <60, hours 0< <12.
function numIsValid(num1, num2, num3) {
    if (isNaN(num1) || isNaN(num2) || isNaN(num3)) {
        return false;
    }
    var bool = num1 < 12;
    bool = bool && num2 < 60;
    bool = bool && num3 < 60;
    bool = bool && num1 >= 0;
    bool = bool && num2 >= 0;
    bool = bool && num3 >= 0;
    return bool;
}
//-----------------------validateDescription checks if the notes '~','^' are used in the description and converts them to space note, ' '.
function validateDescription(string) {
    var i;
    var res = "";
    var str1 = string.split("~");
    for (i = 0; i < str1.length; i++) {
        var j;
        var str2 = str1[i].split("^");
        for (j = 0; j < str2.length; j++) {
            res += str2[j] + " ";
        }
    }
    return res;
}
//----------------------convertFromTime gets a time string hh:mm:ss and converts it to the time in seconds.
function convertFromTime(string) {
    var str = string.split(":");
    return +str[0] * 3600 + +str[1] * 60 + +str[2];
}
//----------------------convertToTime gets a number which is the time in seconds and converts it to a time string hh:mm:ss.
function convertToTime(number) {
    var str = "";
    var tmpstr="";
    if (number % 60 < 10) {
        tmpstr = "0" + number % 60;
    } else { tmpstr = number % 60;}
    str += tmpstr;
    for (var i = 0; i < 3; i++) {
        number -= number % 60;
        number /= 60;
        if (number % 60 < 10) {
            tmpstr = "0";
        } else { tmpstr = ""; }
        tmpstr += number % 60;
        str += ":" + tmpstr;
    }
    var tmp = str.split(":");
    var ret = tmp[2] + ":" + tmp[1] + ":" + tmp[0];
    return ret;
}
//-----------------------newInputMaker creates a new input strip: description, hours, minutes, seconds, and if needed startButton.
function newInputMaker(count) {
    var div = document.createElement("div");
    var desc = document.createElement("input");
    var hours = document.createElement("input");
    var minutes = document.createElement("input");
    var seconds = document.createElement("input");
    var startn = document.createElement("input");
    var currentTime = document.createElement("input");
    currentTime.type = "button";
    currentTime.id = "CT" + count;
    currentTime.onclick = function () {
        var index = currentTime.id.split("T");
        getCurrentTime(index[1]);
    }
    currentTime.value = "current";
    desc.type = "text";
    hours.type = "text";
    minutes.type = "text";
    seconds.type = "text";
    desc.id= "desc" + count;
    hours.id = "ho" + count;
    minutes.id = "min" + count;
    seconds.id = "sec" + count;
    desc.placeholder = "description";
    hours.placeholder = "hh";
    minutes.placeholder = "mm";
    seconds.placeholder = "ss";
    desc.maxLength = descriptionMaxLength;
    hours.maxLength = timeMaxLength;
    minutes.maxLength = timeMaxLength;
    seconds.maxLength = timeMaxLength;
    div.setAttribute("class", "newInput");
    div.id = "newInput" + count;
    startn.setAttribute("type", "button");
    startn.value = "start";
    startn.id = "startn" + count;
    if (!changeFlag) {
        startn.setAttribute("style", "display:none");
    }
    startn.onclick = function () {
        var index = startn.id.split("n");
        newInputStarterFlag(index[1]);
    }
    div.appendChild(desc);
    div.appendChild(hours);
    div.appendChild(minutes);
    div.appendChild(seconds);
    div.appendChild(currentTime);
    div.appendChild(startn);
    if (changeFlag && oneOff) {
        document.body.insertBefore(div, app.$newStart);
        oneOff = false;
    } else {
        document.body.insertBefore(div, app.$Time);
    }
}
//------------getCurrentTime sends message to background.js and gets the currentTime of the video
function getCurrentTime(index) {
    chrome.runtime.sendMessage({ response: "$-8" }, function (tabId) {
        chrome.tabs.sendMessage(tabId, "$-1", function (current) {
            if (!current) {
                alert("no current time, please refresh page");
            } else {
                tmp = current;
                var hours = document.getElementById("ho" + index);
                var minutes = document.getElementById("min" + index);
                var seconds = document.getElementById("sec" + index);
                var time = convertToTime(tmp);
                var str1 = time.split(":");
                hours.value = str1[0];
                minutes.value = str1[1];
                seconds.value = str1[2];
            }
        });
    });
}
//-------- changeUserPreferenceNumber: Inserts into userPreferenceNumber in index the value.
function changeUserPreferenceNumber(index, value) {
    var tmp1 = app.result.timeStrip.split("~");
    var tmp2 = tmp1[index].split(":");
    tmp2[2] = value;
    var tmp3 = tmp2[0] + ":" + tmp2[1] + ":" + tmp2[2];
    tmp1[index] = tmp3;
    var i;
    var newTime = "";
    for (i = 0; i < tmp1.length - 1; i++) {
            newTime += tmp1[i] + "~";
    }
    app.result.timeStrip = newTime;
}

//----------------descCrop: Crops a string if its size is bigger then DESC_SIZE(=10) adds ".." if it is
function descCrop(description) {
    if (description.length < DESC_SIZE) {
        return description;
    }
    var str1 = description.substring(0, DESC_SIZE);
    str1 += "..";
    return str1;
}

//-----------------buttonMaker creates a single time button strip out of the given description and time
function buttonMaker(description, time, count, liker) {
    var div2 = document.createElement("div");
    var starto = document.createElement("input");
    var button = document.createElement("input");
    var text = document.createElement("div");
    var LDdiv = document.createElement("div");
    var like = document.createElement("input");
    var dislike = document.createElement("input");
    var likesCount = document.createElement("h5");
    var startRating = document.createElement("h5");
    var tmp2 = app.result.timeStrip.split("~");
    var tmp3 = tmp2[count].split(":");
    var text2 = document.createTextNode(tmp3[1]);
    var tmp4 = app.result.start.split("~");
    var text3 = document.createTextNode(tmp4[count]);
    likesCount.appendChild(text2);
    likesCount.id = "LC" + count;
    like.type = "button";
    dislike.type = "button";
    LDdiv.setAttribute("class", "LDdiv");
    like.id = "like" + count;
    dislike.id = "dislike" + count;
    if (liker > 0) {
        setLD(like, dislike, ok,wrong,okclicked,wrongclicked, -2, -1, likesCount);
    } else if (liker < 0) {
        setLD(dislike, like, wrong,ok,wrongclicked,okclicked, 2, 1, likesCount);
    } else {
        like.value = "1";
        dislike.value = "-1";
        like.onclick = function () {
            clickLD(like, dislike, okclicked, wrong, ok, wrongclicked, "-2", likesCount);
        }
        dislike.onclick = function () {
            clickLD(dislike, like, wrongclicked, ok, wrong, okclicked, "2", likesCount);
        }
    }
    LDdiv.appendChild(like);
    LDdiv.appendChild(dislike);
    LDdiv.appendChild(likesCount);
    var p = document.createElement("p");
    var span = document.createElement("span");
    var descStr = descCrop(description)
    var i = document.createTextNode(descStr);
    var disc = document.createTextNode(description);
    p.appendChild(disc);
    span.appendChild(i);
    text.appendChild(span);
    text.appendChild(p);
    text.id = "descText" + count;
    text.setAttribute("class", "descClass");
    starto.value = "start";
    starto.setAttribute("type", "button");
    starto.id = "starto" + count;
    starto.setAttribute("style", "display:none");
    starto.onclick = function () {
        var index = starto.id.split("o");
        oldInputStarterFlag(index[1]);
    }
    startRating.appendChild(text3);
    startRating.style.display = "none";
    startRating.id="SR"+count;
    button.setAttribute("type", "button");
    button.setAttribute("value", time);
    button.id = "btn" + count;
    button.onclick = function () {
        tmp = button.value;
        newButtonClick();
    }
    div2.setAttribute("class", "timeButton");
    div2.setAttribute("id", "timeButton"+count);
    div2.appendChild(text);
    div2.appendChild(button);
    div2.appendChild(LDdiv);
    div2.appendChild(starto);
    div2.appendChild(startRating);
    if (count === 0) {
        document.body.insertBefore(div2, app.$newStart);
    } else {
        document.body.insertBefore(div2, app.$Time);
    }
}
//---------------------setLD if like or dislike is pressed, sets the images and values of the like/dislike buttons, as well as functionality
function setLD(DL1,DL2,image1,image2,image3,image4,value, addToLikes, likesCount){
    DL1.onclick = function () {
        declickLD(DL1, DL2, image1, image2, image3, image4, -addToLikes, likesCount);
    };
    DL2.onclick = function () {
        clickLD(DL2, DL1, image4, image1, image2, image3, -value, likesCount);
    };
    DL1.value = addToLikes;
    DL2.value = value;
    DL1.setAttribute("style", "background-image: " + image3);
}
//-----------------declickLD is the functionality of a like/dislike button if and when the button was already clicked, its purpose is to revert
//-----------------the changes of the pressed like/dislike.
function declickLD(DL1, DL2, image1, image2, image3, image4, value, likesCount) {
    DL1.setAttribute("style", "background-image: " + image1);
    changeNumber(likesCount, DL1.value);
    DL1.onclick = function () {
        clickLD(DL1, DL2, image3, image2,image1,image4, -2*value, likesCount);
    };
    DL2.onclick = function () {
        clickLD(DL2, DL1, image4, image1, image2, image3, 2 * value, likesCount);
    };
    var index = DL1.id.split("e");
    var str = app.result.timeStrip.split("~");
    var str2 = str[index[1]].split(":");
    if (index[1] == 0) {
        changeStartLike(DL1, index[1]);
    }
    str2[1] = +str2[1] + +DL1.value;
    DL2.value /= 2;
    app.result.arrLikes[index[1]] = 0;
    if (index[1] != app.result.oldInputStartIndex) {
        changeUserPreferenceNumber(index[1], 0);
        toStringTimeStrip(str2[0], str2[1], 0, str, index[1]);
    } else {
        toStringTimeStrip(str2[0], str2[1], 2, str, index[1]);
    }
    chrome.runtime.sendMessage({ timeStrip: index[1], descStrip: "0", response: "$-5" });
    app.result.response = "$-4";
    chrome.runtime.sendMessage(app.result);
    DL1.value = value;
}
//--------------clickLD is the functionality of a like/dislike button when not clicked before.
function clickLD(DL1, DL2, image1, image2, image3, image4, value, likesCount) {
    DL1.setAttribute("style", "background-image: "+image1);
    DL2.setAttribute("style", "background-image: "+image2);
    DL1.onclick = function () {
        declickLD(DL1, DL2, image3, image2, image1, image4, -value / 2, likesCount);
    };
    DL2.onclick = function () {
        clickLD(DL2, DL1, image4, image3, image2, image1, -value, likesCount);
    };
    changeNumber(likesCount, DL1.value);
    var index = DL1.id.split("e");
    var str = app.result.timeStrip.split("~");
    var str2 = str[index[1]].split(":");
    if (index[1] == 0) {
        changeStartLike(DL1, index[1]);
    }
    str2[1] = +str2[1] + +DL1.value;
    app.result.arrLikes[index[1]] = DL1.value;
    if (index[1] != app.result.oldInputStartIndex) {
        var val = 0;
        if (+DL1.value < 0) {
            val = -1;
        } else if (+DL1.value > 0) {
            val = 1;
        }
        changeUserPreferenceNumber(index[1], val);
    } else {
        var val = 2;
    }
    DL2.value = value;
    toStringTimeStrip(str2[0], str2[1], val, str, index[1]);
    chrome.runtime.sendMessage({ timeStrip: index[1], descStrip: DL1.value, response: "$-5" });
    app.result.response = "$-4";
    chrome.runtime.sendMessage(app.result);
    DL1.value = value / 2;
}
//---------------changeStartLike this function changes the start rating when like is pressed. will be called from clickLD and declickLD only
//---------------when the like/dislike button clicked is the first one.
function changeStartLike(DL,index) {
    var str3 = app.result.start.split("~");
    str3[index] = +str3[index] + +DL.value;
    rebuildStart(str3);
    var SR = document.getElementById("SR" + index);
    changeNumber(SR, +DL.value);
}
//---------------changeNumber changes the number of an HTML document with a textNode like: ":NUM" into: ":NUM+change".
function changeNumber(likesCount, change) {
    likesCount.firstChild.nodeValue = +likesCount.firstChild.nodeValue + +change;
}
//---------------toStringTimeStrip changes the app.timeStrip in index where like has changed.
function toStringTimeStrip(time, like, userRating, arrayRest, index) {
    var str = time + ":" + like + ":" + userRating + "~";
    var str2 = "";
    var i;
    for (i = 0; i < arrayRest.length - 1; i++) {
        if (i === +index) {
            str2 += str;
        } else {
            str2 += arrayRest[i] + "~";
        }
    }
    app.result.timeStrip = str2;
}
//---------------senderClick is the function called when the sender, or go button, is clicked. the purpose:1)compile all new inputs into strips
//----------and add them to old time description and start strips. 2)send the info to background to be proccessed and sent to DB. 3)close popup.
function senderClick() {
    senderGetTimes();
    chrome.runtime.sendMessage({ arrL: app.result.arrLikes, response: "$-6", timeStrip: app.result.timeStrip });
    app.result.response = "$-1";
    chrome.runtime.sendMessage(app.result);
    self.close();
}
//------ getVideoLength: Gets the current video length to limit the time entered
function getVideoLength() {
    chrome.runtime.sendMessage({ response: "$-8" }, function (tabId) {
        chrome.tabs.sendMessage(tabId, "$-10", function (length) {
            videoLength = length;
        });
    });     
}
//------ toStringLikes: returns a string of the likes array
function toStringLikes() {
    var str1 = "";
    var i = 0;
    for (i = 0; i < app.result.arrLikes.length - 1; i++) {
        str1 += app.result.arrLikes[i] + "~";
    }
    str1 += app.result.arrLikes[i];
    return str1;
}
//-------------senderGetTimes gets all the new, valid, inputs and adds them to the old strips.
function senderGetTimes() {
    var res = "";
    var description = "";
    var starter = "";
    var arrLike = toStringLikes();
    var ho, min, sec, desc, div;
    for (let i = 0; i < app.counter; i++) {
            ho = document.getElementById("ho" + i);
            min = document.getElementById("min" + i);
            sec = document.getElementById("sec" + i);
            desc = document.getElementById("desc" + i);
            div = document.getElementById("newInput" + i);
            startn = document.getElementById("startn" + i);
            if (!ho || !min || !sec || !desc || !div || !startn) {
                alert("not found in document");
            } else {
                if (!numIsValid(ho.value, min.value, sec.value) || !desc.value) {
                    invalidTime(ho, min, sec, desc, div);
                } else {
                    var tmp1 = ho.value + ":" + min.value + ":" + sec.value;
                    var time = convertFromTime(tmp1);
                    if (+time >= videoLength) {
                        invalidTime(ho, min, sec, desc, div);
                    } else {
                        description += validateDescription(desc.value) + "~";
                        if (i == newInputStartIndex) {
                            res += time + ":0:2~";
                            var stmp = app.result.timeStrip.split("~");
                            app.result.oldInputStartIndex = i + stmp.length - 1;
                            starter += "1~";
                            arrLike += "~0";

                        } else {
                            res += time + ":0:1~";
                            starter += "0~";
                            arrLike += "~0";
                        }
                    }
                }
            }
    }
    app.result.arrLikes = arrLike.split("~");
    app.result.timeStrip += res;
    app.result.descStrip += description;
    app.result.start += starter;
}
//------ invalidTime: Removes all elements from new input strip and adds: "invalid time Input"
function invalidTime(ho, min, sec, desc, div) {
    var h5 = document.createElement("h5");
    var text = document.createTextNode("invalid time Input");
    h5.appendChild(text);
    div.removeChild(ho);
    div.removeChild(sec);
    div.removeChild(min);
    div.removeChild(desc);
    div.removeChild(startn);
    div.appendChild(h5);
}
//---------------newButtonClick sends the time of a time button to background.
function newButtonClick() {
    tmp = convertFromTime(tmp);
    if (tmp == 0) {
        tmp = "$-3";
    }
    var res = { timeStrip: "0", descStrip: "0", response: tmp };
    chrome.runtime.sendMessage(res);
}
//----------------newInputStarterFlag when a new input is flagged start adds 1 to start value of said input, and lowers by 1 the selected start.
function newInputStarterFlag(index) {                                            //this function is for new times
    if (index >= app.counter || index < 0) {
        alert("invalid index");
        return;
    }
    var ho, min, sec, desc, div,start;
    ho = document.getElementById("ho" + index);
    min = document.getElementById("min" + index);
    sec = document.getElementById("sec" + index);
    desc = document.getElementById("desc" + index);
    div = document.getElementById("newInput" + index);
    start = document.getElementById("startn" + index);          //id for newinputstart button startn
    if (!ho || !min || !sec || !desc || !div || !start) {
        alert("not found in document");
    } else {
            start.disabled = true;
            start.name = "startclicked";
            if (newInputStartIndex>=0) {
                replaceTmpStart("startn" + newInputStartIndex);
            }
            if (app.result.oldInputStartIndex >= 0) {
                var tmp2 = app.result.start.split("~");
                tmp2[app.result.oldInputStartIndex]--;
                changeUserPreferenceNumber(app.result.oldInputStartIndex, app.result.arrLikes[app.result.oldInputStartIndex]);
                rebuildStart(tmp2);
                replaceTmpStart("starto" + app.result.oldInputStartIndex);
                lowerSR("SR" + app.result.oldInputStartIndex);
                app.result.oldInputStartIndex = -1;
            }
            newInputStartIndex = index;
        }
}
//-------------replaceTmpStart unpicks the selected start time
function replaceTmpStart(id) {
    var tmpStart = document.getElementById(id);
    tmpStart.name = "start";
    tmpStart.disabled = false;
}
//-------------lowerSR decrements the selected Start Rating
function lowerSR(id) {
    var SR = document.getElementById(id);
    changeNumber(SR, -1);
}
//-------------oldInputStarterFlag when an old input is flagged start, adds 1 to its start count, and decrements the previously selected start.
function oldInputStarterFlag(index) {                                //this function is onclick for times already in DB
    var start = document.getElementById("starto" + index);          //id for start change button starto
    var SR = document.getElementById("SR" + index);
    if (!start || !SR) {
        alert("not found button");
        return;
    }
    start.name = "startclicked";
    changeNumber(SR, 1);
    if (newInputStartIndex>=0) {
        replaceTmpStart("startn" + newInputStartIndex);
        newInputStartIndex = -1;
    }
    var tmp1 = app.result.start.split("~");
    if (app.result.oldInputStartIndex >= 0 && index != app.result.oldInputStartIndex) {
        tmp1[app.result.oldInputStartIndex]--;
        changeUserPreferenceNumber(app.result.oldInputStartIndex, app.result.arrLikes[app.result.oldInputStartIndex]);
        replaceTmpStart("starto" + app.result.oldInputStartIndex);
        lowerSR("SR" + app.result.oldInputStartIndex);
    }
    tmp1[index]++;
    changeUserPreferenceNumber(index, 2);
    app.result.oldInputStartIndex = index;
    start.disabled = true;
    rebuildStart(tmp1);
}
//---------rebuildStart when an old input start is either flagged or deflagged, the start strip changes, therefore this function rebuilds it
//---------after the selected number changes.
function rebuildStart(arr) {
    var i;
    var start="";
    for (i = 0; i < arr.length - 1; i++) {
        start += arr[i] + "~";
    }
    app.result.start = start;
}
//---------changeStartClick the function of when the change start button is clicked. reveals start flag buttons, as well as start ratings.
//---------creates new input if new start time is required.
function changeStartClick() {                                         
    getVideoLength();
    changeFlag = true;
    document.body.setAttribute("style", "min-width: 390px;");
    app.$sender.setAttribute("style", "display:inline-block;");
    app.$sender.addEventListener("click", senderClick);
    var tmp1 = app.result.timeStrip.split("~");
    var i;
    for (i = 0; i < tmp1.length - 1; i++) {
        var starto = document.getElementById("starto" + i);
        starto.style.display = "inline-block";
        if (i == app.result.oldInputStartIndex) {
            starto.name = "startclicked";
            starto.disabled = true;
        }
        var SR = document.getElementById("SR" + i);
        SR.style.display = "inline-block";
    }
    for (i = 0; i < app.counter; i++) {
        var startn = document.getElementById("startn" + i);
        startn.style.display = "inline-block";
    }
    newInputMaker(app.counter);
    app.counter++;
    app.$changeStart.style.display = "none";
    alert("to change the start time, click on the start button next to the wanted new time");
}

                                            //tommorrow testing!!
