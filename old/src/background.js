/**
 * Created by apesant on 27/07/16.
 */
/**
 * The background page waits for messages coming from the content script which it redirects to the Devtools page
 */
(function () {
    var connections = {};

    chrome.runtime.onConnect.addListener(function (port) {

        console.log("Received a connection from ", port);

        var extensionListener = function (message, sender, sendResponse) {

            console.log("Message received ", message);

            // The original connection event doesn't include the tab ID of the
            // DevTools page, so we need to send it explicitly.
            switch (message.name){
                case 'init':
                    connections[message.tabId] = port;
                    break;
                case 'execScript':
                    console.log("Injecting script " + message.scriptToInject);
                    chrome.tabs.executeScript(message.tabId,
                        { file: message.scriptToInject });
                    break;
                default:
                    break;
            }

            // other message handling
        }

        // Listen to messages sent from the DevTools page
        port.onMessage.addListener(extensionListener);

        port.onDisconnect.addListener(function(port) {
            port.onMessage.removeListener(extensionListener);

            var tabs = Object.keys(connections);
            for (var i=0, len=tabs.length; i < len; i++) {
                if (connections[tabs[i]] == port) {
                    delete connections[tabs[i]]
                    break;
                }
            }
        });
    });

// Receive message from content script and relay to the devTools page for the
// current tab
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        // Messages from content scripts should have sender.tab set
        console.log("Message received from content script", request);
        if (sender.tab) {
            var tabId = sender.tab.id;
            if (tabId in connections) {
                connections[tabId].postMessage(request);
            } else {
                console.log("Tab not found in connection list.");
            }
        } else {
            console.log("sender.tab not defined.");
        }
        return true;
    });
})();