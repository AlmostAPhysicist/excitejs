import { defineConfig } from "vite";

export default defineConfig({
    // This must match your GitHub repo name for assets to load
    base: "/excitejs/",
    build: {
        // This outputs the website files into a folder named 'site'
        // It stays totally separate from your 'dist' folder
        outDir: "site",
        rollupOptions: {
            input: {
                // Point exactly to your example HTML file
                main: "examples/component-toggle/index.html",
            },
        },
    },
});