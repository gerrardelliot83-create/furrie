import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Temporary UI review files (for Claude Desktop)
    "temp-ui-review/**",
    // Standalone tooling with its own package.json (see scripts/tooling/README.md)
    "scripts/tooling/**",
  ]),
]);

export default eslintConfig;
