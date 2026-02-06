import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: true,
    // This matches your 'src/demo.ts' entry point
    lib: {
      entry: "src/demo.ts",
      formats: ["es"],
      fileName: "demo",
    },
  },
});
