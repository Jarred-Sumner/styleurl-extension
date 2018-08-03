const fs = require("fs");
var path = require("path");
var changelogParser = require("changelog-parser");

const root = path.resolve(__dirname, "..");

var pkg = require(path.resolve(root, "package.json"));
var logPath = path.resolve(root, "CHANGELOG.md");
const README_PATH = path.resolve(root, "README.md");
const _ = require("lodash");

const README = fs.readFileSync(README_PATH, "utf-8");

const WHATS_NEW_STRING = "### What's New";

function formatDate(date) {
  var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return monthNames[monthIndex] + " " + day + ", " + year;
}

changelogParser(logPath, function(err, result) {
  if (err) throw err;

  // check for 'unreleased' section in CHANGELOG: allow sections which do not include a body (eg. 'Added', 'Changed', etc.)

  var unreleased = result.versions
    .filter(function(release) {
      return release.title && release.title.toLowerCase
        ? release.title.toLowerCase().indexOf("unreleased") !== -1
        : false;
    })
    .filter(function(release) {
      return !!release.body;
    });

  if (unreleased.length > 0) {
    throw new Error("Unreleased changes detected in CHANGELOG.md, aborting");
  }

  var log = result.versions.filter(function(release) {
    return release.version !== null;
  })[0];

  if (!log) {
    throw new Error("Changelog missing");
  }

  const whatsNewIndex = README.indexOf(WHATS_NEW_STRING);
  const hasWhatsNewSection = whatsNewIndex > -1;
  console.log(README);
  if (!hasWhatsNewSection) {
    throw new Error(`README is missing ${WHATS_NEW_STRING}`);
  }

  const whatsNewEnd = README.substr(whatsNewIndex).indexOf("---");

  const whatsNewSection = `${WHATS_NEW_STRING} (v${log.version} - ${formatDate(
    new Date()
  )})

${log.body}

---
  `;
  const newReadMe =
    README.substr(0, whatsNewIndex) +
    whatsNewSection +
    README.substr(whatsNewIndex + whatsNewEnd + "\n---".length);
  fs.writeFileSync(README_PATH, newReadMe);
});
