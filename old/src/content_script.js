/**
 * Created by apesant on 27/07/16.
 */

/**
 * The content script only forwards the messages it receives to the background page.
 */
(function () {
    console.log("Starting the content script!");

    function injectedScript(){

        setInterval(function () {
            window.postMessage({
                name: 'Hello, world! Message sent at ' + Date.now() + ' milliseconds',
                source : 'chrome-devtools-extension'
            }, '*');
        }, 5000);
    }

    //Inject the injected_script
    var script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ injectedScript +')();'));
    (document.body || document.head || document.documentElement).appendChild(script);


    window.addEventListener('message', function(event) {
        // Only accept messages from the same frame
        if (event.source !== window) {
            return;
        }

        var message = event.data;

        // Only accept messages that we know are ours
        if (typeof message !== 'object' || message === null ||
            !message.source === 'chrome-devtools-extension') {
            return;
        }

        //Forward the message
        chrome.runtime.sendMessage(message);
    });
})();