import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Configuração base
  js.configs.recommended,

  // Configurações do Next.js
  ...compat.extends("next/core-web-vitals"),

  // Configurações do TypeScript
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: await import("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": (await import("@typescript-eslint/eslint-plugin")).default,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Configurações globais
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      quotes: ["error", "single", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },

  // Ignorar arquivos
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "dist/",
      "*.config.js",
      "*.config.ts",
      "eslint.config.js",
    ],
  },
];
