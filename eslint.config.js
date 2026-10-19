import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      "no-undef": "off",
      // Load-on-mount via setState in effects is used throughout the app; revisit with the data-fetching refactor.
      "react-hooks/set-state-in-effect": "warn",
      // Existing `any` casts in AccountsView/BudgetsView are tracked debt; make them errors once typed.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
