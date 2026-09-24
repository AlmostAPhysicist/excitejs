import { defineConfig } from "vite";

// Test build: src/test.ts (with the library bundled in) -> dist-test/test.js, runnable with node
export default defineConfig({
    publicDir: false,
    build: {
        outDir: "dist-test",
        emptyOutDir: true,
        minify: false,
        lib: {
            entry: "src/test.ts",
            fileName: "test",
            formats: ["es"]
        }
    }
});
