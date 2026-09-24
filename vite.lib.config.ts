import { defineConfig } from "vite";

// npm package build: src/index.ts -> dist/ (types are added afterwards by tsc)
export default defineConfig({
    publicDir: false, // public/ is for the site only
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