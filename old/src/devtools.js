import DiffMatchPatch from "diff-match-patch";
import { portName } from "../../chrome/extension/lib/port";

const diffMatchPatch = new DiffMatchPatch();
diffMatchPatch.Patch_Margin = 16;

function ResourceMap() {
  this._map = {};
}
ResourceMap.prototype = {
  get: function(key) {
    this.assertKey(key);
    if (!this._map.hasOwnProperty(key)) {
      throw new Error(
        "resourceMap does not have " + JSON.stringify(key) + " key."
      );
    }
    return this._map[key];
  },
  set: function(key, value) {
    this.assertKey(key);
    this._map[key] = value;
  },
  assertKey: function(key) {
    if (!key) {
      throw new Error("key is " + JSON.stringify(key));
    }
  }
};

var resourceMap;
var lastStylesheetURL = "";
var addedCSS = "";

/**
 * @param {Object} event
 * @return {boolean}
 */
function isNewlyAdded(event) {
  return event.url.indexOf("inspector://") == 0 || event.type === "document";
}

chrome.devtools.inspectedWindow.onResourceContentCommitted.addListener(function(
  event,
  content
) {
  if (isNewlyAdded(event)) {
    if (lastStylesheetURL) {
      getBackend(lastStylesheetURL);
    } else {
      getLastStylesheetURL(getBackend);
    }
  } else {
    getBackend(event.url);
  }

  function getBackend(url) {
    chrome.extension.sendRequest({ method: "getBackend", url: url }, function(
      response
    ) {
      if (!response) {
        console.error(
          url + " doesn't match any rules in the DevTools Autosave options."
        );
        return;
      }

      sendToBackgroundPage();

      function sendToBackgroundPage() {
        var patch;
        if (isNewlyAdded(event)) {
          console.info(
            "New CSS rules added. Appending them to",
            lastStylesheetURL
          );
          var oldAddedCSS = addedCSS;
          if (content) {
            addedCSS = "\n" + content + "\n";
          } else {
            addedCSS = "";
          }
          patch = diffMatchPatch.patch_make(
            resourceMap.get(lastStylesheetURL) + oldAddedCSS,
            resourceMap.get(lastStylesheetURL) + addedCSS
          );
        } else {
          patch = diffMatchPatch.patch_make(resourceMap.get(url), content);
          resourceMap.set(url, content);
        }

        if (arePatchesEmpty(patch)) {
          console.error("Patch for " + JSON.stringify(url) + " is empty.");
          return;
        }

        chrome.extension.sendRequest({
          method: "send",
          content: JSON.stringify(patch),
          url: response.serverURL,
          headers: {
            "Content-Type": "application/json",
            "X-URL": url,
            "X-Path": response.savePath,
            "X-Type": event.type
          }
        });
      }
    });
  }
});

/**
 * @param {Array} patches
 * @nosideeffects
 * @return {Boolean}
 */
function arePatchesEmpty(patches) {
  for (var i = 0, ii = patches.length; i < ii; i++) {
    if (patches[i].diffs.length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Function} onSuccess
 */
function getLastStylesheetURL(onSuccess) {
  lastStylesheetURL = "";
  chrome.devtools.inspectedWindow.eval(
    '(function() {\n\
      var links = document.head.querySelectorAll("link[rel=stylesheet][href]");\n\
      var last = links[links.length - 1];\n\
      return last && last.href})()',
    function(href, fail) {
      if (fail || !href) {
        throw new Error("Cannot find link[rel=stylesheet][href] in the head.");
      }
      lastStylesheetURL = href;
      onSuccess(href);
    }
  );
}

/**
 * @param {Resource} resource
 */
function addResource(resource) {
  console.log("RESOURCE", resource.type, resource.url);
}

function getAllResources() {
  console.info("Loading all scripts and stylesheets");
  resourceMap = new ResourceMap();
  chrome.devtools.inspectedWindow.getResources(function(resources) {
    resources.forEach(addResource);
  });
}

getAllResources();

chrome.devtools.inspectedWindow.onResourceAdded.addListener(addResource);

chrome.devtools.network.onNavigated.addListener(function() {
  console.info("A page reloaded");
  addedCSS = "";
});
