// main.ts

import { ScheduledPage, UnscheduledPage } from "./page.ts";

const schduled_header = document.createElement("h1"); schduled_header.innerText = "Scheduled"; document.body.appendChild(schduled_header);
document.body.appendChild(ScheduledPage());
const unscheduled_header = document.createElement("h1"); unscheduled_header.innerText = "Unscheduled"; document.body.appendChild(unscheduled_header);
document.body.appendChild(UnscheduledPage());