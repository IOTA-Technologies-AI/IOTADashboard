# Permission Error Handling Implementation

## Overview

This document describes the complete error handling flow for permission denied scenarios in the Expense module.

## Problem

When a user doesn't have permission to view expenses, they were seeing a generic "No data" message instead of a clear "Permission Denied" message.

## Solution

Implemented a complete error propagation chain from backend to UI:

### 1. Backend (API Layer)

**File:** `/iotaapiserver/supabase/supabase.ts`

- `getExpenses()` validates user permission using `requirePermission()`
- Returns 403 HTTP status with error message if permission denied
- Error structure: `{ code: 'PermissionDenied', message: '...' }`

### 2. Frontend API Helper

**File:** `/next-js/src/utils/apiHelper.js`

**getExpenses() function:**

```javascript
.catch((error) => {
  console.error('❌ Expenses API error:', error.response?.data || error.message);
  // Check if it's a permission error
  if (error.response?.status === 403) {
    console.error('🔒 Permission denied: User does not have access to expenses');
    throw new Error('PERMISSION_DENIED: You do not have permission to view expenses');
  }
  // For other errors, also throw instead of returning empty array
  throw new Error(error.response?.data?.message || error.message || 'Failed to fetch expenses');
});
```

**Key Changes:**

- ✅ Throws `PERMISSION_DENIED` error on 403 status
- ✅ Includes error message with prefix for easy identification
- ✅ No longer returns empty array `[]` on errors
- ✅ Propagates errors up to page layer

### 3. Page Component (Server-Side)

**File:** `/next-js/src/app/dashboard/expense/page.jsx`

```javascript
export default async function Page() {
  let expenses = [];
  let permissionError = null;

  try {
    console.log("📄 Fetching expenses from API...");
    expenses = await apiHelper.getExpenses();
    console.log("📄 Fetched expenses:", expenses?.length || 0);
  } catch (error) {
    console.error("📄 Error fetching expenses:", error);

    // Check if it's a permission error
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      console.error("🔒 Permission denied - user cannot view expenses");
      permissionError = "You do not have permission to view expenses";
      expenses = [];
    } else {
      // For other errors, return empty array
      console.error("❌ Failed to fetch expenses:", error.message);
      expenses = [];
    }
  }

  return (
    <ExpenseListView expenses={expenses} permissionError={permissionError} />
  );
}
```

**Key Changes:**

- ✅ Added `permissionError` state variable
- ✅ Catches permission errors specifically using `includes('PERMISSION_DENIED')`
- ✅ Passes `permissionError` prop to view component
- ✅ Differentiates between permission errors and other errors

### 4. View Component (Client-Side)

**File:** `/next-js/src/sections/expense/view/expense-list-view.jsx`

**Props & State:**

```javascript
export function ExpenseListView({
  expenses: initialExpenses = [],
  permissionError = null,
}) {
  const [permissionDenied, setPermissionDenied] = useState(!!permissionError);

  // Update permission denied state when prop changes
  useEffect(() => {
    if (permissionError) {
      console.log("🔒 Permission denied state set:", permissionError);
      setPermissionDenied(true);
    }
  }, [permissionError]);

  // ... rest of component
}
```

**UI Rendering:**

```jsx
{
  permissionDenied ? (
    <TableNoData
      notFound
      title="Permission Denied"
      subTitle="You don't have permission to view expenses. Please contact your administrator."
      sx={{
        "& .MuiTypography-h6": { color: "error.main" },
      }}
    />
  ) : (
    <TableNoData notFound={notFound} />
  );
}
```

**Key Changes:**

- ✅ Added `permissionError` prop
- ✅ Added `permissionDenied` state initialized from prop
- ✅ Added `useEffect` to update state when prop changes
- ✅ Conditional rendering: Shows red "Permission Denied" message when true
- ✅ Shows standard "No data" message for empty results

## Complete Error Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User tries to access /dashboard/expense                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 2. Permission Guard checks if user has menu access          │
│    - If NO: Redirect to 403 page                           │
│    - If YES: Continue to page                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 3. page.jsx calls apiHelper.getExpenses()                   │
│    - Includes userEmail, role, roleId in request            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend validates permission with requirePermission()    │
│    - Checks userNavPermissions table                        │
│    - Validates path + role access                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        v                   v
   ✅ ALLOWED          ❌ DENIED
        │                   │
        v                   v
┌──────────────┐   ┌─────────────────┐
│ Return data  │   │ Throw 403 error │
└──────┬───────┘   └─────┬───────────┘
       │                 │
       v                 v
┌──────────────┐   ┌─────────────────────────────────────────┐
│ page.jsx     │   │ apiHelper catches 403                   │
│ receives     │   │ - Throws: "PERMISSION_DENIED: ..."     │
│ expenses[]   │   └─────┬───────────────────────────────────┘
└──────┬───────┘         │
       │                 v
       │          ┌──────────────────────────────────────────┐
       │          │ page.jsx catches error                   │
       │          │ - Checks if includes('PERMISSION_DENIED')│
       │          │ - Sets permissionError prop              │
       │          └─────┬────────────────────────────────────┘
       │                │
       v                v
┌──────────────────────────────────────────────────────────────┐
│ ExpenseListView receives props:                              │
│ - expenses: [] (empty array)                                 │
│ - permissionError: string (if denied) or null (if allowed)   │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  v
┌──────────────────────────────────────────────────────────────┐
│ UI renders appropriate message:                              │
│ - If permissionError: "Permission Denied" (RED)              │
│ - If no data but allowed: "No data" (default)                │
└──────────────────────────────────────────────────────────────┘
```

## Testing Steps

### Test 1: User WITH Permission

1. Login as user with expense access
2. Navigate to `/dashboard/expense`
3. **Expected Result:**
   - Page loads successfully
   - Expenses are displayed in table
   - No error messages

### Test 2: User WITHOUT Permission (Permission Denied)

1. Login as user WITHOUT expense access
2. Navigate to `/dashboard/expense`
3. **Expected Result:**
   - Page loads but shows error
   - Red message: "Permission Denied"
   - Subtitle: "You don't have permission to view expenses. Please contact your administrator."
   - NO generic "No data" message

### Test 3: User WITH Permission but No Data

1. Login as user with expense access
2. Ensure database has no expenses
3. Navigate to `/dashboard/expense`
4. **Expected Result:**
   - Page loads successfully
   - Shows generic "No data" message
   - NOT the red "Permission Denied" message

## Console Logs for Debugging

When permission is denied, you should see these logs in order:

```javascript
// 1. Page component
📄 Fetching expenses from API...

// 2. API Helper
❌ Expenses API error: { code: 'PermissionDenied', message: '...' }
🔒 Permission denied: User does not have access to expenses

// 3. Page component catch
📄 Error fetching expenses: PERMISSION_DENIED: You do not have permission to view expenses
🔒 Permission denied - user cannot view expenses

// 4. View component
🔒 Permission denied state set: You do not have permission to view expenses
```

## Key Differences from Previous Implementation

| Aspect                | Before                            | After                                        |
| --------------------- | --------------------------------- | -------------------------------------------- |
| **Error Handling**    | Returns `[]` on error             | Throws error with `PERMISSION_DENIED` prefix |
| **Error Propagation** | Errors caught and hidden          | Errors bubble up to page component           |
| **UI Message**        | Generic "No data"                 | Specific "Permission Denied" (red)           |
| **User Feedback**     | Confusing (looks like empty data) | Clear (permission issue)                     |
| **Debugging**         | Hard to diagnose                  | Clear error messages in console              |

## Security Notes

1. **Frontend Guard:** Still blocks UI rendering and redirects to 403 for unauthorized menu access
2. **Backend Validation:** Always validates permissions - even if frontend is bypassed
3. **Error Messages:** Provide clear feedback without exposing sensitive information
4. **Logging:** All permission checks logged to console for debugging

## Files Modified

1. ✅ `/next-js/src/utils/apiHelper.js` - Throw permission errors instead of returning empty array
2. ✅ `/next-js/src/app/dashboard/expense/page.jsx` - Catch and pass permission errors
3. ✅ `/next-js/src/sections/expense/view/expense-list-view.jsx` - Display permission denied UI

## Next Steps

1. **Test** the complete flow with a user who doesn't have expense access
2. **Apply same pattern** to other protected resources:
   - Invoice list
   - Vendor list
   - Payroll list
   - Deal list
   - BDM list
3. **Enhance error messages** with more specific guidance (e.g., "Contact admin@company.com to request access")
4. **Add error tracking** (e.g., Sentry) to monitor permission denied attempts
