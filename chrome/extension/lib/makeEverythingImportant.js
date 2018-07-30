const getStylesheet = element => {
  for (let i = 0; i < document.styleSheets.length; i++) {
    const stylesheet = document.styleSheets[i];

    if (stylesheet.ownerNode === element) {
      return stylesheet;
    }
  }

  return null;
};

export const makeAllRulesImportant = styleElement => {
  if (!styleElement) {
    return;
  }

  const stylesheet = getStylesheet(styleElement);

  for (let i = 0; i < stylesheet.rules.length; i++) {
    const rule = stylesheet.rules[i];

    if (!rule.style) {
      continue;
    }

    for (let k = 0; k < rule.style.length; k++) {
      const declarationName = rule.style[k];
      const value = rule.style.getPropertyValue(declarationName);

      // A lot of shorthand properties mark everything as initial, e.g. "background"
      // We don't wanna actually set those to !important
      if (value !== "initial") {
        rule.style.setProperty(declarationName, value, "important");
      }
    }
  }
};
