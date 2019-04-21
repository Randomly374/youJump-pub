// JavaScript source code

//------------------------------------------------------------------GLOBAL VARIABLES------------------------------------------------------------
var info = { time: "-1", desc: "NaD", start: "0", startClicked: 0 };   //---- time, desc, start are the strips from the main database, for this
//--------------------------------------------------------------------------- specific video. startClicked is the start selected by the user.
var arrLikes = ["a", "a"]; //---- Array of values range {-1, 0, 1}, of like/dislike selected by the user for each time.
var video;  //---- the video in the current page.
//----------------------------------------------------------------GLOBAL VARIABLES END----------------------------------------------------------
//------- Next line happens when content.js is injected.
checkforVideo();
//------ checkForVideo: Gets the video element as soon as possible by interval searching.
function checkforVideo() {
    var b = setInterval(function(){
        video = document.getElementsByClassName("video-stream html5-main-video");
        if (video[0]!=null) {
            video[0].onloadedmetadata = newVid;
            clearInterval(b);
        }                   
    },500);
}
//------- resetInfo: in case of not saved video resets all params of this content.js page
function resetInfo() {
    info = { time: "-1", desc: "NaD", start: "0", startClicked: 0 };
    arrLikes = ["a", "a"];
}
//------- getTime:  Gets the start time from background.js and resets video listeners.
function getTime() {
    chrome.runtime.sendMessage({ response: "$-7" }, function (time) {
        video[0].onloadeddata = null;
        video[0].onloadedmetadata = newVid;
        video[0].onabort = newVid;
        video[0].onended = newVid;
        if (time != null && time != "-1") {
            video[0].currentTime = time;
        } else {
            if (time === "-1") {
                resetInfo();
            }
        }
    });
}
//------- newVid:   Closes the popup if opened, sets video.onloadeddata to getTimes function above.
function newVid() {
    chrome.runtime.sendMessage({ response: "$-11" });
    video[0].onloadedmetadata = null;
    video[0].onloadeddata = getTime;
    video[0].onabort = newVid;
    video[0].onended = newVid;
}
//------- runtime.onMessageListener:    Handles messages from background and popup.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var str = [request];
        if (isNaN(request)) {
            var str = request.split("^");
        } if (str[0] === "$-1") {//$-1: Message from popup.js, sends the currentTime of the video.
            var curTime = video[0].currentTime.toFixed(0);
            if (+curTime - video[0].currentTime > 0) {
                sendResponse(+curTime - 1);
            } else {
                sendResponse(curTime);
            }
        } else if (str[0] === "$-2") {//$-2:    Message from background.js, sends back the arrLikes of this page. If not initiated sends -1.
            if (arrLikes[0] === "a") {
                sendResponse("-1");
            }
            else {
                sendResponse(arrLikes);
            }
        } else if (str[0] == "$-3") {//$-3:     Message from background.js, sets current time 0.
                video[0].currentTime = 0;
        } else if (str[0] === "$-4") {//$-4:    Message from background.js, sets one value of arrLikes.
            arrLikes[str[1]] = str[2];
        } else if (str[0] === "$-5") {//$-5:    Message from background.js, sends the info stored here.
            sendResponse(info);
        } else if (str[0] === "$-6") {//$-6:    Message from background.js, sets the info{time, desc, start}.
            info.time = str[1];
            info.desc = str[2];
            info.start = str[3];
        }
        else if (str[0] === "$-8") {//$-8:  Message from background.js, sets info.startClicked.
            info.startClicked = str[1];
        } else if (str[0] === "$-9") {//$-9:    Message from background.js, sends info.startClicked.
            sendResponse(info.startClicked);
        } else if (str[0] === "$-10") {
            sendResponse(video[0].duration);
        }
        else {
            if (!video[0]) {//else: Message from background.js, sets video.currentTime to the time sent.
                alert("not found vid number");
            } else {
                video[0].currentTime = str[0];
            }
        }
});

