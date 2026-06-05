//main.js 

import "./devtools";
import "./test";
import "./preact-usage";

import { Clicker } from "./clicker";
import { PreactUsage } from "./preact-usage";

// Mount the component to the DOM
const appRoot = document.getElementById("app") || document.body;
appRoot.appendChild(Clicker());
appRoot.appendChild(PreactUsage());