import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Modal forms intentionally copy a record into local state when they open,
      // and the auth/session bootstrap hydrates state from localStorage. Both are
      // deliberate synchronisations with external state.
      "react-hooks/set-state-in-effect": "off",
      // useQuery/useMutation keep the latest loader in a ref so inline callbacks
      // do not retrigger fetches on every render.
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
