const fs = require("fs");
const ChromeExtension = require("crx");
const path = require("path");

const RELEASES_PATH = path.join(__dirname, "../releases");
const BUILD_PATH = path.join(__dirname, "../build");
const manifest = require(path.join(BUILD_PATH, "manifest.json"));
const name = manifest.name;
const version = manifest.version;
const argv = require("minimist")(process.argv.slice(2));

const keyPath = argv.key || "key.pem";
const existsKey = fs.existsSync(keyPath);
const crx = new ChromeExtension({
  appId: argv["app-id"],
  codebase: argv.codebase,
  privateKey: existsKey ? fs.readFileSync(keyPath) : null
});

const ghRelease = require("gh-release");

const baseName = `${name}-${version}-${new Date().toISOString()}`;
const crxFilename = path.join(RELEASES_PATH, `${baseName}.crx`);
const zipFileName = path.join(RELEASES_PATH, `${baseName}.zip`);

crx
  .load(BUILD_PATH)
  .then(() => crx.loadContents())
  .then(async archiveBuffer => {
    return new Promise((resolve, reject) => {
      fs.writeFile(zipFileName, archiveBuffer, () => {
        console.log(`Wrote ${zipFileName}`);

          const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");
          if (fs.existsSync(CREDENTIALS_PATH) && !!argv["release"]) {
            console.log("Uploading to Chrome Store...");
            const webStore = require("chrome-webstore-upload")({
              ...require(CREDENTIALS_PATH),
              extensionId: "emplcligcppnlalfjknjbanolhlnkmgp"
            });

            webStore
              .fetchToken()
              .then(token => {
                return webStore
                  .uploadExisting(fs.createReadStream(zipFileName), token)
                  .then(res => {
                    console.log("Uploaded to Chrome Store...Publishing");
                    return webStore.publish("default", token);
                  })
                  .then(() =>
                    console.log(`Published ${version} to Chrome Store successfully`)
                  );
              })
              .catch(err => console.error(err));
          }
        });

        return resolve(
          crx.pack(archiveBuffer).then(crxBuffer => {
            return new Promise((resolve, reject) => {
              fs.writeFile(crxFilename, crxBuffer, () => {
                console.log(`Wrote ${crxFilename}`);
                resolve();
              });
            });
          })
        );
      });
    });
  })
  .then(() => {
    if (!argv["release"]) {
      return;
    }

    const options = {
      tag_name: `v${version}`,
      version: version,
      target_commitish: "master",
      name: `v${version}`,
      body: `New version`,
      draft: false,
      prerelease: false,
      repo: "styleurl-extension",
      owner: "Jarred-Sumner",
      endpoint: "https://api.github.com",
      auth: require(`/Users/${
        process.env.USER
      }/Library/Application Support/gh-release/config.json`),
      assets: [`./releases/${baseName}.crx`, `./releases/${baseName}.zip`]
    };

    return new Promise((resolve, reject) => {
      ghRelease(options, function(err, result) {
        if (err) {
          reject(err);
          return;
        }

        resolve(result); // create release response: https://developer.github.com/v3/repos/releases/#response-4
      });
    });
  })
  .catch(err => {
    console.error(err);
  });
