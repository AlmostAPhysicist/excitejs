import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        emptyOutDir: true,
        lib: {
            entry: "src/index.ts",
            name: "ExciteJS",
            fileName: "index",
            formats: ["es"]
        }
    }
});