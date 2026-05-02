// vite.config.ts
import { vitePlugin as remix } from "file:///C:/Users/Kamesh/Documents/github/infraflux-seo/node_modules/@remix-run/dev/dist/index.js";
import { defineConfig } from "file:///C:/Users/Kamesh/Documents/github/infraflux-seo/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///C:/Users/Kamesh/Documents/github/infraflux-seo/node_modules/vite-tsconfig-paths/dist/index.js";
import { vercelPreset } from "file:///C:/Users/Kamesh/Documents/github/infraflux-seo/node_modules/@vercel/remix/vite.js";
var vite_config_default = defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeRoutingByFile: true,
        v3_throwAbortReason: true
      }
    }),
    tsconfigPaths()
  ],
  server: {
    host: true,
    allowedHosts: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLYW1lc2hcXFxcRG9jdW1lbnRzXFxcXGdpdGh1YlxcXFxpbmZyYWZsdXgtc2VvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLYW1lc2hcXFxcRG9jdW1lbnRzXFxcXGdpdGh1YlxcXFxpbmZyYWZsdXgtc2VvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9LYW1lc2gvRG9jdW1lbnRzL2dpdGh1Yi9pbmZyYWZsdXgtc2VvL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgdml0ZVBsdWdpbiBhcyByZW1peCB9IGZyb20gXCJAcmVtaXgtcnVuL2RldlwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgeyB2ZXJjZWxQcmVzZXQgfSBmcm9tIFwiQHZlcmNlbC9yZW1peC92aXRlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZW1peCh7XG4gICAgICBwcmVzZXRzOiBbdmVyY2VsUHJlc2V0KCldLFxuICAgICAgZnV0dXJlOiB7XG4gICAgICAgIHYzX2ZldGNoZXJQZXJzaXN0OiB0cnVlLFxuICAgICAgICB2M19yZWxhdGl2ZVJvdXRpbmdCeUZpbGU6IHRydWUsXG4gICAgICAgIHYzX3Rocm93QWJvcnRSZWFzb246IHRydWUsXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHRzY29uZmlnUGF0aHMoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogdHJ1ZSxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VSxTQUFTLGNBQWMsYUFBYTtBQUM1VyxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLG1CQUFtQjtBQUMxQixTQUFTLG9CQUFvQjtBQUU3QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixTQUFTLENBQUMsYUFBYSxDQUFDO0FBQUEsTUFDeEIsUUFBUTtBQUFBLFFBQ04sbUJBQW1CO0FBQUEsUUFDbkIsMEJBQTBCO0FBQUEsUUFDMUIscUJBQXFCO0FBQUEsTUFDdkI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLEVBQ2hCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
