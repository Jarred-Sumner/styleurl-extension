/**
 * Created by apesant on 27/07/16.
 */
(function () {

    log("================Devtools extension is running================== ");

    var messageDiv = document.getElementById("text");

    var backgroundPageConnection = chrome.runtime.connect({
        name: "DevtoolsExtention"
    });

    log("Hello from the devtools panel");

    backgroundPageConnection.onMessage.addListener(function (message) {
        log("DevtoolsExtention panel : new message " + message.name);
        // Handle responses from the background page, if any
        messageDiv.textContent = message.name;
    });

    setTimeout(function () {
        backgroundPageConnection.postMessage({
            name: 'init',
            tabId: chrome.devtools.inspectedWindow.tabId
        });

        backgroundPageConnection.postMessage({
            name: 'execScript',
            tabId: chrome.devtools.inspectedWindow.tabId,
            scriptToInject: "src/content_script.js"
        });
    }, 100);

    function log(message){
        chrome.devtools.inspectedWindow.eval(
            "console.log(' %c Devtools skeleton extension: " + message + "'," +
            " 'background: #222; color : #bada55')", function(result, isException){

            });
    }


})();