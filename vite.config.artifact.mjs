import { defineConfig } from "vite";

// Artifact 배포용: 자산·청크를 전부 한 파일에 인라인한다.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-artifact",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    rolldownOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
