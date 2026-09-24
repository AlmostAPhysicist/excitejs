// main.ts

import "./devtools";

import { Gallery } from "./gallery.ts";

const app_root = document.getElementById("app") ?? document.body;
app_root.appendChild(Gallery());
