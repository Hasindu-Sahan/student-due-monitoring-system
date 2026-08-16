import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", ".next/**", "src/generated/prisma/**"],
  },
  js.configs.recommended,
  ...nextVitals,
  prettier,
];
