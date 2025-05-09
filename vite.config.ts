import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.js",
      name: "Waitly snippet",
      fileName: "waitly-snippet",
      formats: ["umd"],
    },
  },
});
