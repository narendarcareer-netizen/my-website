import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const outDir = process.env.EXTENSION_OUT_DIR || "dist";

  return {
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          background: resolve(__dirname, "src/background/index.ts"),
          content: resolve(__dirname, "src/content/index.ts"),
          popup: resolve(__dirname, "src/popup/index.html"),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === "background" ? "background.js" : chunk.name === "content" ? "content.js" : "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
    plugins: [{
      name: "manifest",
      buildStart() {
        const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as Record<string, unknown>;
        if (mode === "extension-production") {
          const value = process.env.JOBPILOT_PRODUCTION_ORIGIN;
          if (!value) throw new Error("Set JOBPILOT_PRODUCTION_ORIGIN=https://yourdomain.com for a production extension build.");
          const origin = new URL(value).origin;
          manifest.host_permissions = [
            `${origin}/api/extension/*`,
            "https://boards.greenhouse.io/*",
            "https://job-boards.greenhouse.io/*",
            "https://jobs.lever.co/*",
          ];
          manifest.externally_connectable = { matches: [`${origin}/*`] };
        }
        this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(manifest) });
      },
    }],
  };
});
