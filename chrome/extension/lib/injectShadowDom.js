import React from "react";
import ReactDOM from "react-dom";
import ShadowDOM from "react-shadow";

const Z_INDEX = 2147483647;

export const injectShadowDOM = ({
  id,
  Component,
  include,
  position = "bottom"
}) => {
  if (!!document.querySelector(id)) {
    return;
  }

  // Sorry Intercom!
  if (document.querySelector("#intercom-container")) {
    document.querySelector("#intercom-container").style.display = "none";
  }

  const disableIntercomForcefully = document.createElement("style");
  disableIntercomForcefully.id =
    "__styleurl-disable-intercom-while-styleurl-bar-in-page-sorry-intercom";
  disableIntercomForcefully.innerHTML =
    "#intercom-container { display: none !important; opacity: 0 !important; pointer-events: none !important; }";
  document.body.appendChild(disableIntercomForcefully);

  const shadowContainer = document.createElement("div");
  shadowContainer.id = id;
  shadowContainer.style.width = "100%";
  shadowContainer.style.position = "fixed";
  shadowContainer.style.left = 0;
  shadowContainer.style.right = 0;
  shadowContainer.style.display = "block";
  shadowContainer.style.zIndex = Z_INDEX; // https://stackoverflow.com/questions/491052/minimum-and-maximum-value-of-z-index
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

  const spacerDiv = document.createElement("div");
  spacerDiv.style.width = "1px";
  spacerDiv.style.height = "50px";
  spacerDiv.style.content = "''";
  spacerDiv.style.display = "block";

  spacerDiv.id = "__styleurl-spacer";

  document.body.appendChild(spacerDiv);
};
