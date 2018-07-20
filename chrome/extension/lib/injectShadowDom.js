import React from "react";
import ReactDOM from "react-dom";
import ShadowDOM from "react-shadow";

export const injectShadowDOM = ({
  id,
  Component,
  include,
  position = "bottom"
}) => {
  const shadowContainer = document.createElement("div");
  shadowContainer.id = id;
  shadowContainer.style.width = "100%";
  shadowContainer.style.position = "fixed";
  shadowContainer.style.left = 0;
  shadowContainer.style.right = 0;
  shadowContainer.style.zIndex = 9999999;
  shadowContainer.style.boxSizing = "border-box";

  if (position === "bottom") {
    shadowContainer.style.bottom = 0;
  } else if (position === "top") {
    shadowContainer.style.top = 0;
  }

  document.body.appendChild(shadowContainer);

  ReactDOM.render(
    <ShadowDOM include={include}>
      <div className="StyleURLShadowDOMRoot ignore-react-onclickoutside">
        <base href={`chrome-extension://${chrome.runtime.id}`} />
        <Component />
      </div>
    </ShadowDOM>,
    shadowContainer
  );
};
