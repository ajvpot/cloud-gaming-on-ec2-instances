// @ts-nocheck
"use client";
import React, { ReactNode, useEffect, useState } from "react";
// @ts-ignore
import dcv from "https://assets-oh3.pages.dev/dcvjs-esm/dcv.js";

import "@cloudscape-design/global-styles/index.css";
import { DCVViewer } from "https://assets-oh3.pages.dev/dcv-ui/dcv-ui.js";
import useHash from "@/lib/useHash";

const LOG_LEVEL = dcv.LogLevel.INFO;
const BASE_URL = "https://assets-oh3.pages.dev/dcvjs-esm/";

const DEFAULT_SETTINGS = {
  sessionId: "",
  authToken: "",
  extensionData: "",
  promptReconnect: true,
  logLevel: "info",
  wss: true,
  enabledChannels: [],
  customChannels: [],
  displayCodecs: [],
  enableQU: true,
  minQuality: 30,
  maxQuality: 0,
  maxDisplayWidth: 0,
  maxDisplayHeight: 0,
  minDisplayWidth: 640,
  minDisplayHeight: 480,
  debugLayer: false,
  enableGraphicsDebugLayer: true,
  clientHiDpiScaling: false,
  enableWebCodecs: true,
  losslessColorspace: "rgb",
  dynamicResolution: true,
  enableShortcutEditor: false,
  scaleToFit: false,
  volume: 100,
  microphone: false,
  webcam: false,
  macOptionToAlt: true,
  macCommandToControl: false,
  appearanceMode: "System default",
  toolbarBehavior: "Auto-hide toolbar only in full screen",
  displayQuality: "Best responsiveness",
  metricsEnabled: false,
  selectedResolution: "adaptive",
  selectedWebcamId: null,
  highColorAccuracy: true,
  forceKeyboardCombinations: false,
  timezoneRedirectionEnabled: true,
};

let auth: any;

function Client() {
  const [hashData, setHash] = useHash();

  const [authenticated, setAuthenticated] = React.useState(false);
  const [sessionId, setSessionId] = React.useState("");
  const [authToken, setAuthToken] = React.useState("");
  const [credentials, setCredentials] = React.useState(
    hashData.get("username") || hashData.get("password")
      ? {
          username: hashData.get("username"),
          password: hashData.get("password"),
        }
      : {},
  );

  const SERVER_URL = hashData.get("server");

  const onSuccess = (_, result) => {
    var { sessionId, authToken } = { ...result[0] };

    console.log("Authentication successful.");

    setSessionId(sessionId);
    setAuthToken(authToken);
    setAuthenticated(true);
    setCredentials({});
  };

  const onPromptCredentials = (_, credentialsChallenge) => {
    // check if all credentials requested in credentialsChallenge.requiredCredentials exist in credentials
    if (
      credentialsChallenge.requiredCredentials.every(
        (challenge: any) => challenge.name in credentials,
      )
    ) {
      console.log("We have all the credentials requested.");
      auth.sendCredentials(credentials);
      return;
    }
    let requestedCredentials = {};

    credentialsChallenge.requiredCredentials.forEach(
      (challenge) => (requestedCredentials[challenge.name] = ""),
    );
    setCredentials(requestedCredentials);
  };

  const authenticate = () => {
    dcv.setLogLevel(LOG_LEVEL);

    auth = dcv.authenticate(SERVER_URL, {
      promptCredentials: onPromptCredentials,
      error: onError,
      success: onSuccess,
    });
  };

  const updateCredentials = (e) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value,
    });
  };

  const submitCredentials = (e) => {
    auth.sendCredentials(credentials);
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!authenticated) {
      authenticate();
    }
  }, [authenticated]);

  const handleDisconnect = (reason) => {
    console.log(
      "Disconnected: " + reason.message + " (code: " + reason.code + ")",
    );
    auth.retry();
    setAuthenticated(false);
  };

  return authenticated ? (
    <DCVViewer
      dcv={{
        sessionId: sessionId,
        authToken: authToken,
        serverUrl: SERVER_URL,
        baseUrl: BASE_URL,
        onDisconnect: handleDisconnect,
        logLevel: LOG_LEVEL,
      }}
      uiConfig={{
        toolbar: {
          visible: true,
          fullscreenButton: true,
          multimonitorButton: true,
        },
      }}
    />
  ) : (
    <div
      style={{
        height: window.innerHeight,
        backgroundColor: "#373737",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form style={{ display: "none" }}>
        <fieldset>
          {Object.keys(credentials).map((cred) => (
            <input
              key={cred}
              name={cred}
              placeholder={cred}
              type={cred === "password" ? "password" : "text"}
              onChange={updateCredentials}
              value={credentials[cred]}
            />
          ))}
        </fieldset>
        <button type="submit" onClick={submitCredentials}>
          Login
        </button>
      </form>
      <p>
        You may have to{" "}
        <a href={SERVER_URL} className={`text-blue-200`}>
          accept the Unsigned SSL Cert here
        </a>{" "}
        before connecting.
      </p>
    </div>
  );
}

const onError = (_, error) => {
  console.log("Error during the authentication: " + error.message);
  throw error;
};

export default Client;
