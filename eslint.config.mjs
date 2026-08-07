import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**","node_modules/**","extension/node_modules/**","extension/dist/**","automation/node_modules/**","automation/test-results/**","automation/playwright-report/**","worker/node_modules/**","out/**","next-env.d.ts"]),
]);
