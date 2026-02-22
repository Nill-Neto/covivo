# AI Development Rules for this App

## Tech Stack
*   **Framework:** [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (based on [Radix UI](https://www.radix-ui.com/))
*   **Routing:** [React Router Dom v6](https://reactrouter.com/)
*   **State Management & Data Fetching:** [TanStack Query v5 (React Query)](https://tanstack.com/query/latest)
*   **Backend & Auth:** [Supabase](https://supabase.com/)
*   **Forms:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Testing:** [Vitest](https://vitest.dev/)

## Rules and Guidelines

### 1. Component Architecture
*   Place reusable UI components in `src/components/ui/`.
*   Place feature-specific components in `src/components/[feature-name]/`.
*   Place main page components in `src/pages/`.
*   Keep `src/App.tsx` as the central hub for routing.

### 2. Styling
*   Always use Tailwind CSS for styling.
*   Utilize shadcn/ui components for consistent design.
*   Avoid inline styles unless absolutely necessary for dynamic values.
*   Use `cn()` utility for conditional class merging.

### 3. State Management
*   Use `TanStack Query` for all server-side state (fetching, caching, mutations).
*   Use standard React `useState`/`useContext` for local/global UI state.
*   Keep state as local as possible.

### 4. Forms and Validation
*   Use `react-hook-form` for all form implementations.
*   Use `zod` to define schemas for form validation and API responses.
*   Integrate `zod` with `react-hook-form` using `@hookform/resolvers`.

### 5. Backend Integration
*   Use the Supabase client located in `src/integrations/supabase/client.ts`.
*   Handle authentication using the `AuthContext` provided in `src/contexts/AuthContext.tsx`.

### 6. Development Workflow
*   Follow TypeScript best practices (avoid `any`, use proper interfaces/types).
*   Add descriptive `console.log` statements for debugging but remove them before "production" (unless requested).
*   Ensure all new pages are added to the routing in `src/App.tsx`.
*   Maintain clean and readable code, prioritizing simplicity over over-engineering.
