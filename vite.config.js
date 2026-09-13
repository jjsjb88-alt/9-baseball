import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/9-baseball/" : "/",
  server: {
    watch: {
      // The autonomous loop drops a Chrome profile in .qa-chrome for screen QA. Watching its
      // locked Cookies file kills the dev server with EBUSY mid-session.
      ignored: ["**/.qa-*", "**/.qa-*/**"],
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules[\\/]/,
            },
          ],
        },
      },
    },
  },
});
