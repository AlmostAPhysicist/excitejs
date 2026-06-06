import { defineConfig } from "vite";

export default defineConfig({
    build: {
        emptyOutDir: false,

        lib: {
            entry: "src/index.ts",
            name: "ExciteJS",
            fileName: "index",
            formats: ["es"]
        }
    },
    base: "/excitejs/"
});