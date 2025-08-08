import eslint from "@eslint/js"
import {
  configs as tsEslintConfigs,
  parser as tsEslintParser,
  plugin as tsEslintPlugin,
} from "typescript-eslint"
import { flatConfigs } from "eslint-plugin-import-x"
import stylistic from "@stylistic/eslint-plugin"
import stylisticTs from "@stylistic/eslint-plugin-ts"

const esLintConfig = [
  eslint.configs.recommended,
  ...tsEslintConfigs.recommendedTypeChecked,
  flatConfigs.recommended,
  flatConfigs.typescript,
  {
    ignores: [
      "**/*.js",
      "**/.nuxt",
      "**/.output",
      "**/cdk.out",
      "**/coverage",
      "**/dist",
      "**/node_modules",
      "**/public",
      "**/reports",
      "schema.d.ts",
      "src/schema.d.ts",
      "src/types.d.ts",
      "types.d.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      parser: tsEslintParser,
      parserOptions: {
        project: null,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
      "@stylistic": stylistic,
      "@stylistic/ts": stylisticTs,
    },
    rules: {
      ...{
        "@stylistic/array-bracket-newline": ["error", "consistent"],
        "@stylistic/arrow-parens": ["error", "always"],
        "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
        "@stylistic/comma-dangle": ["error", "always-multiline"],
        "@stylistic/comma-spacing": ["error", { before: false, after: true }],
        "@stylistic/eol-last": ["error", "always"],
        "@stylistic/function-call-argument-newline": ["error", "consistent"],
        "@stylistic/function-call-spacing": ["error"],
        "@stylistic/function-paren-newline": ["error", "consistent"],
        "@stylistic/indent": ["error", 2],
        "@stylistic/indent-binary-ops": ["error", 2],
        "@stylistic/key-spacing": ["error"],
        "@stylistic/max-len": [
          "warn",
          {
            code: 120,
            ignoreComments: true,
            ignoreRegExpLiterals: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreUrls: true,
          },
        ],
        "@stylistic/member-delimiter-style": ["error", {
          multiline: {
            delimiter: "none",
            requireLast: true,
          },
          singleline: {
            requireLast: false,
          },
          multilineDetection: "brackets",
        }],
        "@stylistic/no-multi-spaces": ["error"],
        "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
        "@stylistic/no-tabs": ["error"],
        "@stylistic/no-trailing-spaces": ["error"],
        "@stylistic/no-whitespace-before-property": ["error"],
        "@stylistic/newline-per-chained-call": ["error", { ignoreChainWithDepth: 4 }],
        "@stylistic/object-curly-newline": [
          "error",
          { multiline: true, consistent: true },
        ],
        "@stylistic/object-curly-spacing": ["error", "always"],
        "@stylistic/object-property-newline": [
          "error",
          { allowMultiplePropertiesPerLine: true },
        ],
        "@stylistic/operator-linebreak": [
          "error",
          "after", { overrides: { "?": "before", ":": "before" } },
        ],
        "@stylistic/quote-props": ["error", "as-needed"],
        "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
        "@stylistic/rest-spread-spacing": ["error"],
        "@stylistic/semi": ["error", "never"],
        "@stylistic/space-before-blocks": ["error"],
        "@stylistic/space-in-parens": ["error", "never"],
        "@stylistic/space-infix-ops": ["error"],
        "@stylistic/spaced-comment": ["error", "always", { exceptions: ["*"] }],
        "@stylistic/switch-colon-spacing": ["error"],
        "@stylistic/type-annotation-spacing": ["error"],
        "@stylistic/type-generic-spacing": ["error"],
        "@stylistic/yield-star-spacing": ["error", "after"],
        "@stylistic/generator-star-spacing": ["error", { before: false, after: true }],
      },
      ...{
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrors: "none",
          },
        ],
        "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],
        camelcase: "error",
      },
      "no-redeclare": "off",
      "no-var": "error",
      "object-shorthand": ["error", "always"],
      "no-restricted-imports": "off",
    },
    settings: {
      "import-x/extensions": [".js", ".ts"],
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
        node: true,
      },
      "import-x/parsers": {
        espree: [".js", ".cjs", ".mjs", ".jsx"],
        "@typescript-eslint/parser": [".ts"],
      },
    },
  },
  {
    files: ["specs/**", "src/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
  {
    files: [
      "src/domain/**",
      "src/interfaces/controllers/**",
      "src/interfaces/repositories/**",
    ],
    rules: {
      "no-redeclare": "off",
    },
  },
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    ignores: ["**/*.spec.ts", "**/*.test.ts"],
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@faker-js/faker",
              message: "Importing faker in non-unit test files causes our build to break in dev/prod silently",
            },
          ],
          patterns: [
            {
              group: ["**/*.{js,ts,jsx,tsx}"],
              message: "Do not import unit test modules in non-unit test modules",
            },
          ],
        },
      ],
    },
  },
]

export default [
  ...esLintConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./src/__tests__/tsconfig.json"],
      },
    },
  },
]
