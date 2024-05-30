"use client";

import React, { ReactNode, useEffect, useState } from "react";
import "@cloudscape-design/global-styles/index.css";
import dynamic from "next/dynamic";

const BASE_URL = "https://assets-oh3.pages.dev/dcvjs-esm/dcv.js";

const Client = dynamic(() => import("./client"), { ssr: false });

function Connect() {
  return <Client />;
}

export default Connect;
