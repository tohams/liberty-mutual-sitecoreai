import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "jsx-a11y/alt-text": "off" } },
  globalIgnores([
    "node_modules/**",
    ".next*/**",
    ".sitecore/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
