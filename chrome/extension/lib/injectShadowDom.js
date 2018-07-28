import React from "react";
import ReactDOM from "react-dom";
import ShadowDOM from "react-shadow";

export const injectShadowDOM = ({
  id,
  Component,
  include,
  position = "bottom"
}) => {
  if (!!document.querySelector(id)) {
    return;
  }

  const shadowContainer = document.createElement("div");
  shadowContainer.id = id;
  shadowContainer.style.width = "100%";
  shadowContainer.style.position = "fixed";
  shadowContainer.style.left = 0;
  shadowContainer.style.right = 0;
  shadowContainer.style.display = "block";
  shadowContainer.style.zIndex = 2147483647; // https://stackoverflow.com/questions/491052/minimum-and-maximum-value-of-z-index
  shadowContainer.style.boxSizing = "border-box";

  if (position === "bottom") {
    shadowContainer.style.bottom = 0;
  } else if (position === "top") {
    shadowContainer.style.top = 0;
  }

  document.body.appendChild(shadowContainer);

  ReactDOM.render(
    <ShadowDOM>
      <div className="ignore-react-onclickoutside">
        <link rel="stylesheet" href={include} type="text/css" />
        <div className="StyleURLShadowDOMRoot">
          <Component />
        </div>
      </div>
    </ShadowDOM>,
    shadowContainer
  );
};
