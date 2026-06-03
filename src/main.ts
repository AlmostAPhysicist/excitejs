//main.js 
import "./devtools";
import "./test";

import { Clicker } from "./clicker";

// Mount the component to the DOM
const appRoot = document.getElementById("app") || document.body;
appRoot.appendChild(Clicker());