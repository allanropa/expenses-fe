# Refactored Code Structure Guide

## Quick Start

The application has been refactored into modular components. Here's how to understand the new structure:

### Main Entry Point
- **`src/main.tsx`**: Now acts as a slim orchestrator (~50 lines)
  - Imports all view components
  - Manages navigation state
  - Handles authentication

### Core Services
- **`src/api.ts`**: API communication layer (unchanged)
- **`src/types.ts`**: TypeScript type definitions (unchanged)

---

## Component Architecture

### Common Components (`src/components/common/`)
Reusable UI components used across the app:

```typescript
<Modal />          // Dialog/popup component with Escape key support
<ActionMenu />     // 3-dot menu for item actions
```

### Feature Components

#### 1. **Auth Module** (`src/components/auth/`)
```
Auth.tsx (100 lines)
  ├─ Login form
  ├─ Registration form
  └─ Error handling
```

**Usage**:
```typescript
import { Auth } from "./components/auth/Auth";

<Auth onSession={(session) => setSession(session)} />
```

---

#### 2. **Dashboard Module** (`src/components/dashboard/`)
```
DashboardView.tsx (120 lines)
  ├─ Summary metrics
  ├─ Account balances
  ├─ Debt overview
  ├─ Budget status
  └─ Recent transactions
```

**Props**: `None` (uses internal API calls)

---

#### 3. **Accounts Module** (`src/components/accounts/`)
```
AccountsView.tsx (220 lines)
  ├─ Account list
  ├─ Add account modal
  ├─ Account details panel
  ├─ Balance adjustments
  └─ Archive functionality
```

**Props**: 
```typescript
{ csrf: string }
```

---

#### 4. **Transactions Module** (`src/components/transactions/`)
```
TransactionsView.tsx (200 lines)
  ├─ Unified debit/credit interface
  ├─ Support for accounts (debit)
  ├─ Support for cards (credit)
  ├─ Transaction history
  └─ Category management
```

**Features**:
- Switch between debit and credit transactions
- Auto-populate currency based on selected account/card
- Installment support for credit transactions

**Props**:
```typescript
{ csrf: string }
```

---

#### 5. **Cards Module** (`src/components/cards/`)
```
CardsView.tsx (80 lines)
  ├─ Card list
  ├─ Outstanding debt summary
  └─ Card management
```

**Props**:
```typescript
{ csrf: string }
```

---

#### 6. **Loans Module** (`src/components/loans/`)
```
LoansView.tsx (70 lines)
  ├─ Loan list
  ├─ Outstanding principal tracking
  └─ Interest rate display
```

**Props**:
```typescript
{ csrf: string }
```

---

#### 7. **Budgets Module** (`src/components/budgets/`)
```
BudgetsView.tsx (80 lines)
  ├─ Budget list
  ├─ Budget type display (daily/maximum)
  └─ Total configured amount
```

**Props**:
```typescript
{ csrf: string }
```

---

#### 8. **Settings Module** (`src/components/settings/`)
```
SettingsView.tsx (100 lines)
  ├─ Profile update
  ├─ Currency preference
  ├─ Timezone setting
  └─ Batch save
```

**Props**:
```typescript
{
  csrf: string;
  user: Session["user"];
}
```

---

## Utilities & Hooks

### Utilities (`src/utils/formatters.ts`)

```typescript
// Format currency according to locale
money(100000, "COP") // → "$ 100.000"
money(99.99, "USD")   // → "$99.99"

// Get readable period labels
periodLabel("monthly") // → "Mensual"
periodLabel("daily")   // → "Diario"

// Create ISO date strings (YYYY-MM-DD)
toISODateString()      // → "2026-10-18"
toISODateString(date)  // → Custom date formatted
```

---

### Custom Hooks (`src/hooks/index.ts`)

#### `useApiData<T>(url: string, dependencies: unknown[] = [])`
Generic data fetching with error handling.

```typescript
const { data, loading, error, refetch } = useApiData<Account[]>("/api/accounts", []);

if (loading) return <p>Loading...</p>;
if (error) return <p>Error: {error.message}</p>;
return <div>{data?.map(account => ...)}</div>;
```

---

#### `useForm<T extends Record<string, unknown>>(initialState: T)`
Manage form state without boilerplate.

```typescript
const { form, setForm, updateField, reset } = useForm({
  name: "",
  email: "",
  password: "",
});

// Update entire form
setForm({ ...form, name: "John" });

// Update single field
updateField("name", "Jane");

// Reset to initial state
reset();
```

---

#### `useModal(initialOpen = false)`
Manage modal visibility state.

```typescript
const { open, open_modal, close_modal, toggle } = useModal();

<button onClick={open_modal}>Open</button>
<Modal open={open} onClose={close_modal}>
  <form onSubmit={(e) => {
    e.preventDefault();
    close_modal();
  }}>
    {/* form content */}
  </form>
</Modal>
```

---

#### `useSelection<T extends { id: number }>(items: T[], initialId?: number)`
Manage list item selection.

```typescript
const { selectedId, selected, select, clear } = useSelection(accounts);

{accounts.map(account => (
  <button
    key={account.id}
    onClick={() => select(account.id)}
    className={selectedId === account.id ? "selected" : ""}
  >
    {account.name}
  </button>
))}

{selected && <AccountDetail account={selected} />}
```

---

## Fixed Issues

### 1. useEffect Dependencies
**Problem**: Infinite loops or missing dependencies
**Solution**: Proper dependency arrays with `[]` for mount-only effects

```typescript
// ✅ Runs only on mount
useEffect(() => {
  loadData();
}, []);

// ✅ Runs when specific dependencies change
useEffect(() => {
  if (selectedId) loadDetails(selectedId);
}, [selectedId]);
```

### 2. Date Handling
**Problem**: `new Date()` called in form state initialization causes re-renders
**Solution**: Centralized `toISODateString()` utility

```typescript
// ✅ BEFORE (BUG)
const [form, setForm] = useState({
  date: new Date().toISOString().slice(0, 10) // Changes on every render!
});

// ✅ AFTER
const [form, setForm] = useState({
  date: toISODateString() // Consistent
});
```

### 3. Race Conditions
**Problem**: Sequential API calls could result in inconsistent state
**Solution**: `Promise.all()` for parallel loads

```typescript
// ✅ AFTER
const load = async () => {
  const [accounts, categories, cards] = await Promise.all([
    api<Account[]>("/api/accounts"),
    api<Category[]>("/api/categories"),
    api<Card[]>("/api/cards"),
  ]);
  setAccounts(accounts);
  setCategories(categories);
  setCards(cards);
};
```

### 4. Error Handling
**Problem**: Silent failures with `.catch(() => undefined)`
**Solution**: Explicit error handling

```typescript
// ✅ AFTER
api<Data>(url)
  .then(setData)
  .catch((error) => {
    console.error("Failed to load:", error);
    // Handle gracefully with defaults
  });
```

---

## Adding New Features

### Adding a New View

1. **Create component file**: `src/components/myfeature/MyFeatureView.tsx`

```typescript
import { useEffect, useState, FormEvent } from "react";
import { api } from "../api";
import type { MyType } from "../types";
import { money } from "../utils/formatters";
import { Modal, ActionMenu } from "./common";
import { useModal, useForm } from "../hooks";

export function MyFeatureView({ csrf }: { csrf: string }) {
  const [items, setItems] = useState<MyType[]>([]);
  const modal = useModal();
  const { form, setForm } = useForm({ /* initial state */ });

  useEffect(() => {
    api<MyType[]>("/api/myfeature")
      .then(setItems)
      .catch((error) => console.error(error));
  }, []);

  return (
    <>
      {/* Your JSX here */}
    </>
  );
}
```

2. **Import in main.tsx**:

```typescript
import { MyFeatureView } from "./components/myfeature/MyFeatureView";

type View = "dashboard" | "myfeature" | /* ... */;

const views: Record<View, ReactNode> = {
  myfeature: <MyFeatureView csrf={activeSession.csrf_token} />,
  // ...
};
```

3. **Add navigation**:

```typescript
const navigation: [View, string][] = [
  ["myfeature", "Mi Característica"],
  // ...
];
```

---

## Performance Tips

1. **Use `useApiData` hook** for data fetching (built-in optimization)
2. **Memoize callbacks** in modal/menu handlers if needed
3. **Lazy load feature components** (future: React.lazy + Suspense)
4. **Avoid inline styles** - use CSS classes instead

---

## Debugging

### View Component Tree
```
App
├─ Auth (if not authenticated)
└─ (when authenticated)
   ├─ Sidebar (navigation)
   └─ Content
      └─ Current View
         ├─ DashboardView
         ├─ AccountsView
         ├─ TransactionsView
         └─ ... etc
```

### Common Issues

**Issue**: "Cannot find module" errors
- **Solution**: Check import paths and file extensions (.tsx vs .ts)

**Issue**: State not updating
- **Solution**: Check useEffect dependencies and ensure state setter is called

**Issue**: API calls not working
- **Solution**: Verify CSRF token is included, check Network tab in DevTools

---

## File Checklist

- [x] `src/main.tsx` - Refactored entry point
- [x] `src/utils/formatters.ts` - Shared utilities
- [x] `src/hooks/index.ts` - Custom React hooks
- [x] `src/components/common/index.ts` - Reusable UI components
- [x] `src/components/auth/Auth.tsx` - Authentication
- [x] `src/components/dashboard/DashboardView.tsx` - Dashboard
- [x] `src/components/accounts/AccountsView.tsx` - Accounts
- [x] `src/components/transactions/TransactionsView.tsx` - Transactions
- [x] `src/components/cards/CardsView.tsx` - Cards
- [x] `src/components/loans/LoansView.tsx` - Loans
- [x] `src/components/budgets/BudgetsView.tsx` - Budgets
- [x] `src/components/settings/SettingsView.tsx` - Settings

---

## Questions?

Refer to the original component implementations for detailed logic. Each component is self-contained and well-commented.

Last updated: 2026-10-18
