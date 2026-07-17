import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    // 1. If you want the site to be at the root of your repo
    // leave root as "./"
    root: "./",

    // 2. Use "./" for base. This is the "magic" fix that solves
    // the ERR_FILE_NOT_FOUND issue locally and on GH Pages.
    base: "./",

    build: {
        outDir: resolve(__dirname, "dist-site"),
        emptyOutDir: true,
        rollupOptions: {
            // Point this to whatever file should be the "Home" page
            input: {
                main: resolve(__dirname, "index.html"),
                toggle: resolve(__dirname, "src/examples/component-toggle/index.html"),
                schdulers: resolve(__dirname, "src/examples/cascades-and-schedules/index.html"),

                pomodoro: resolve(__dirname, "src/examples/pomodoro/index.html"),
                ripple: resolve(__dirname, "src/examples/ripple/index.html"),
                directory: resolve(__dirname, "src/examples/directory/index.html"),
                "themed-page": resolve(__dirname, "src/examples/themed-page/index.html"),
                "theme-workbench": resolve(__dirname, "src/examples/theme-workbench/index.html"),
            }
        }
    }
});