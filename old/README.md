# chrome-devtools-extension
A skeleton for a devtools extension.

This repo contains a simple Chrome extension using injected scripts to send data to a devtools panel in Chrome. The data follows the following pipeline:
injected script => content script => background page => devtools panel. Here a simple message is sent every 5 seconds to the panel from the injected script.
