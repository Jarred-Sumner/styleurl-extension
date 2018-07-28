import URLPattern from "url-pattern";
import YAML from "js-yaml";
import _ from "lodash";

export const loadStylefileFromString = string => {
  return YAML.safeLoad(string);
};

export const shouldApplyStyleToURL = (stylefile, url) => {
  const matchableURL = _.last(url.split("://"));
  const patterns = stylefile.url_patterns.map(
    pattern => new URLPattern(pattern)
  );

  return !!patterns.find(pattern => pattern.match(matchableURL));
};
