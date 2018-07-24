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
  <a
    href={`${__FRONTEND_HOST__}/?utm_source="ext_logo_button"`}
    target="_blank"
  >
    <img
      {...otherProps}
      src={getSrcForSize()}
      srcSet={getSrcSet()}
      height={22.4}
      width={60.8}
      style={{
        userSelect: "none",
        MozUserSelect: "none",
        WebkitUserSelect: "none"
      }}
    />
  </a>
);
