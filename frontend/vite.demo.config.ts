import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import { resolve } from "path";
import fs from "fs";
import path from "path";

const demoDir = resolve(__dirname, "demo");

// Serve zarr store files as raw bytes, bypassing vite's module transform pipeline.
// Without this, vite injects HMR code into extensionless files (.zattrs, .zgroup, etc.)
// which corrupts the JSON that zarrita tries to parse.
function zarrStaticPlugin(): Plugin {
  return {
    name: "zarr-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!url.includes(".zarr")) return next();
        const filePath = path.join(demoDir, url);
        try {
          if (fs.statSync(filePath).isFile()) {
            res.setHeader("Content-Type", "application/octet-stream");
            res.end(fs.readFileSync(filePath));
            return;
          }
        } catch {}
        next();
      });
    },
  };
}

export default defineConfig({
  root: demoDir,
  plugins: [solidPlugin(), zarrStaticPlugin()],
  server: {
    port: 3000,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: resolve(__dirname, "dist/demo"),
    target: "esnext",
    sourcemap: true,
  },
});
