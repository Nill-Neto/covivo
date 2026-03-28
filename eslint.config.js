import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const anyDebtAllowlist = [
  "src/components/layout/AppLayout.tsx",
  "src/components/dashboard/PersonalTab.tsx",
  "src/components/dashboard/RepublicTab.tsx",
  "src/components/dashboard/AdminTab.tsx",
  "src/components/dashboard/CardsTab.tsx",
  "src/components/dashboard/PaymentDialogs.tsx",
  "src/components/ui/scroll-reveal.tsx",
  "src/components/ui/sidebar.tsx",
  "src/components/ui/animated-theme-toggler.tsx",
  "src/components/ui/donut-chart.tsx",
  "src/components/onboarding/DocumentsStep.tsx",
  "src/components/onboarding/CardsStep.tsx",
  "src/pages/Admin.tsx",
  "src/pages/Payments.tsx",
  "src/pages/Bulletin.tsx",
  "src/pages/NewGroup.tsx",
  "src/pages/GroupSettings.tsx",
  "src/pages/Polls.tsx",
  "src/pages/Expenses.tsx",
  "src/pages/Profile.tsx",
  "src/pages/Onboarding.tsx",
  "src/pages/HouseRules.tsx",
  "src/pages/RecurringExpenses.tsx",
  "src/pages/Dashboard.tsx",
  "supabase/functions/check-notifications/index.ts",
  "supabase/functions/generate-report/index.ts",
];

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: false }],
    },
  },
  {
    files: anyDebtAllowlist,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
