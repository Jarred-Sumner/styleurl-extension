import PouchDB from "pouchdb-browser";
import findPlugin from "pouchdb-find";
import { getGistById } from "./api";
import { getStylesheetsFromGist, loadStylefileFromGist } from "./gists";
import { blobToBinaryString } from "blob-util";
import { StyleURL } from "./StyleURLTab";

PouchDB.plugin(findPlugin);

const db = new PouchDB("styleurl-local-themes-1");

export const PROVIDERS = {
  github: "github"
};

db.createIndex({
  index: { fields: ["domains"], name: "domain_search" }
});

db.createIndex({
  index: { fields: ["enabled"], name: "enabled_search" }
});

db.createIndex({
  index: { fields: ["source"], name: "source_index" }
});

db.createIndex({
  index: { fields: ["provider"], name: "provider_index" }
});

export class Theme {
  constructor({
    stylefile,
    domains,
    stylesheets = [],
    source,
    provider,
    doc,
    enabled = false,
    autoupdate_enabled = true
  }) {
    this._doc = doc;
    this.stylefile = stylefile;
    this.stylesheets = stylesheets;
    this.domains = domains || stylefile.domains || [];
    this.source = source;
    this.key = stylefile.key;
    this.provider = provider;
    this.autoupdate_enabled = autoupdate_enabled;
    this.enabled = enabled;
  }

  static findInstalled(_url) {
    const url = new URL(_url);
    console.time("Find Installed", url.hostname);
    return db
      .find({
        selector: {
          enabled: {
            $eq: true
          },
          domains: {
            $elemMatch: {
              $eq: url.hostname
            }
          }
        }
      })
      .then(({ docs }) => {
        if (docs) {
          return Promise.all(docs.map(Theme.fromDoc));
        } else {
          return [];
        }
      })
      .then(res => {
        console.timeEnd("Find Installed", url.hostname);
        return res;
      });
  }

  toStyleURLTab = () => {
    return {
      gistId: this.source,
      gist: null,
      isBarEnabled: false,
      installed: true,
      isStyleEnabled: this.enabled,
      stylefile: this.stylefile,
      stylesheets: this.stylesheets,
      appliedToURLS: {}
    };
  };

  static async fromDoc(doc) {
    const stylesheets = await Promise.all(
      Object.keys(doc._attachments).map(async filename => {
        const attachment = doc._attachments[filename];

        const data =
          attachment.data || (await db.getAttachment(doc._id, filename));

        return blobToBinaryString(data).then(content => {
          return [filename, content];
        });
      })
    );

    return new Theme({
      stylesheets,
      doc,
      stylefile: doc.stylefile,
      source: doc.source,
      provider: doc.provider,
      domains: doc.domains,
      enabled: doc.enabled,
      autoupdate_enabled: doc.autoupdate_enabled
    });
  }

  static async findBySource({ source, provider }) {
    const results = await db.find({
      selector: {
        source: {
          $eq: source
        },
        provider: {
          $eq: provider
        }
      },
      attachments: true,
      binary: true
    });

    if (results.docs && results.docs[0]) {
      return Theme.fromDoc(results.docs[0]);
    } else {
      return null;
    }
  }

  static async fetch({ source, provider }) {
    if (provider === PROVIDERS.github) {
      const existingTheme = await Theme.findBySource({ source, provider });

      if (existingTheme) {
        return existingTheme;
      } else {
        const gist = await getGistById(source);

        if (!gist) {
          return null;
        }

        const stylesheets = getStylesheetsFromGist(gist);
        const stylefile = loadStylefileFromGist(gist);

        return new Theme({
          stylefile,
          stylesheets,
          provider,
          source
        });
      }
    }

    return null;
  }

  static buildID({ source, provider }) {
    return `theme_${provider}_${source}`;
  }

  static async install({ source, provider }) {
    const theme = await Theme.fetch({ source, provider });
    theme.setEnabled(true);

    return theme.save();
  }

  save = async () => {
    if (!this.source) {
      throw new Error("source is required");
    }

    if (!this.provider) {
      throw new Error("provider is required");
    }

    const id = Theme.buildID({ source: this.source, provider: this.provider });

    const attachments = {};

    this.stylesheets.forEach(stylesheet => {
      const blob = new Blob([stylesheet[1]], {
        type: "text/css"
      });

      attachments[stylesheet[0]] = {
        content_type: "text/css",
        data: blob
      };
    });

    let existingThemeDoc;

    try {
      existingThemeDoc = await db.get(id);
    } catch (exception) {}

    const docAttrs = {
      stylefile: this.stylefile,
      domains: this.stylefile.domains,
      key: this.stylefile.key,
      enabled: this.enabled,
      autoupdate_enabled: this.autoupdate_enabled,
      updated_at: new Date().toISOString(),
      provider: this.provider,
      _id: id,
      _attachments: attachments
    };

    let result;
    if (existingThemeDoc) {
      result = await db.put({
        ...docAttrs,
        _rev: existingThemeDoc._rev
      });
    } else {
      result = await db.put(docAttrs);
    }

    if (result.ok) {
      return new Theme({
        doc: docAttrs,
        stylefile: this.stylefile,
        source: this.source,
        provider: this.provider,
        domains: this.domains,
        enabled: this.enabled,
        autoupdate_enabled: this.autoupdate_enabled,
        stylesheets: this.stylesheets
      });
    } else {
      return Promise.reject();
    }
  };

  setEnabled = enabled => {
    this.enabled = enabled;
  };
}
