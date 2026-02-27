import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import url from "@rollup/plugin-url";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    solidPlugin(),
    url({
      include: ["**/*.topojson"],
      limit: 0,
      fileName: "assets/[name][extname]",
    }),
  ],
  assetsInclude: ["**/*.topojson"],
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: true,
    assetsInlineLimit: 0,
    // This matches your 'src/demo.ts' entry point
    lib: {
      entry: resolve(__dirname, "src/demo.ts"),
      formats: ["es"],
      fileName: "demo",
    },
    rollupOptions: {
      // Ensure the assets aren't bundled into the JS
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
