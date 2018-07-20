import React from "react";

const getSrcForSize = multipler => {
  if (!multipler || multipler < 2) {
    return chrome.extension.getURL("img/white-text-logo.png");
  } else {
    return chrome.extension.getURL(`img/white-text-logo@${multipler}x.png`);
  }
};

const getSrcSet = () =>
  [1, 2, 3].map(size => `${getSrcForSize(size)} ${size}x`).join(", \n");

export default ({ src, srcSet, ...otherProps }) => (
  <img
    {...otherProps}
    src={getSrcForSize()}
    srcSet={getSrcSet()}
    height={28}
    width={76}
    style={{
      userSelect: "none",
      MozUserSelect: "none",
      WebkitUserSelect: "none"
    }}
  />
);
