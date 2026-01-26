# Lightweight Layout Quick Reference

## 📌 What is MinimalLayout?

A lightweight dashboard variant for:

- Low-level users accessing a single module
- Focused, distraction-free interface
- Reduced navigation complexity
- Same permissions/security as full dashboard

## 🎨 Visual Differences

### Full Dashboard (DashboardLayout)

```
┌─────────────────────────────────────────────────────────┐
│ Logo │ Workspace │ Search │ Notifications │ Settings    │
├──────────────────────────────────────────────────────────┤
│      │                                                    │
│ [Nav]│                                                    │
│ Sidebar  │          Page Content                         │
│ with all │                                               │
│ modules  │                                               │
│          │                                               │
└──────────────────────────────────────────────────────────┘
```

### Minimal Dashboard (MinimalLayout)

```
┌─────────────────────────────────────────────────────────┐
│ Logo │ Job │ Notifications │ Settings                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│          Page Content (Full Width)                       │
│                                                           │
│                                                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 💻 Implementation Examples

### Example 1: Global Role-Based Layout Selection

```jsx
// src/app/dashboard/layout.jsx
import { useAuthContext } from "src/auth/hooks";
import { DashboardLayout, MinimalLayout } from "src/layouts/dashboard";

export default function DashboardRootLayout({ children }) {
  const { user } = useAuthContext();

  // Use minimal layout for job managers
  if (user?.role === "jobManager" || user?.roleId === 2) {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
```

### Example 2: Per-Page Layout Selection

```jsx
// src/app/dashboard/job/page.jsx
"use client";

import { useAuthContext } from "src/auth/hooks";
import { DashboardLayout, MinimalLayout } from "src/layouts/dashboard";
import { JobPageContent } from "src/sections/job/view";

export default function JobPage() {
  const { user } = useAuthContext();

  // Job page renders in minimal layout for job specialists
  const isJobSpecialist = user?.permissions?.includes("job:manage");

  if (isJobSpecialist) {
    return (
      <MinimalLayout>
        <JobPageContent />
      </MinimalLayout>
    );
  }

  return <JobPageContent />;
}
```

### Example 3: Query Parameter Mode

```jsx
// src/app/dashboard/layout.jsx
import { useSearchParams } from "src/routes/hooks";

export default function DashboardRootLayout({ children }) {
  const searchParams = useSearchParams();
  const isLightweight = searchParams.get("mode") === "lightweight";

  if (isLightweight) {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

// Usage: /dashboard/job?mode=lightweight
```

### Example 4: Admin Configuration

```jsx
// Dynamically check user preferences
export default function DashboardRootLayout({ children }) {
  const { user } = useAuthContext();
  const [userPreferences, setUserPreferences] = useState(null);

  // Fetch user preferences from backend
  useEffect(() => {
    if (user?.id) {
      fetchUserPreferences(user.id).then(setUserPreferences);
    }
  }, [user?.id]);

  // Respect user's layout preference
  if (userPreferences?.preferredLayout === "minimal") {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
```

## 🔐 Permission Handling

Both layouts respect the same permission system:

- Navbar items filtered based on `allowedPaths`
- Pages protected by `PageGuard` component
- Direct URL access blocked if unauthorized
- 403 page shown for denied access

**Permission logic is identical** - only presentation differs!

## 🎯 Use Cases

### JobManager Role

```javascript
user.role = 'jobManager'
↓
Uses MinimalLayout
↓
Shows: Logo + "Job" title + Settings
↓
Can only access job-related pages
```

### SupplyChainManager Role

```javascript
user.role = 'supplyManager'
↓
Uses MinimalLayout
↓
Shows: Logo + "Supply" title + Settings
↓
Can only access supply chain pages
```

### Admin/Manager Role

```javascript
user.role = 'admin'
↓
Uses DashboardLayout
↓
Shows: Full nav + all accessible modules
↓
Can access multiple modules
```

## 🔧 Configuration Options

### MinimalLayout Props

```jsx
<MinimalLayout
  // Optional: custom header slots
  slotProps={{
    header: {
      slots: {
        leftArea: <CustomLeftArea />,
        rightArea: <CustomRightArea />,
      },
    },
  }}
>
  {children}
</MinimalLayout>
```

### Customization Examples

**Change Module Name Display**

```jsx
// In MinimalLayout, the module name comes from pathname
// /dashboard/job → Shows "Job"
// /dashboard/invoice → Shows "Invoice"
// To override, pass custom slot in slotProps
```

**Hide Notifications in Minimal Mode**

```jsx
<MinimalLayout
  slotProps={{
    header: {
      slots: {
        rightArea: (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <SettingsButton />
            <AccountDrawer data={_account} />
          </Box>
        ),
      },
    },
  }}
>
```

## 📱 Responsive Behavior

Both layouts are fully responsive:

- Mobile: Hamburger menu (mobile nav)
- Tablet: Minimal nav
- Desktop: Full layout

MinimalLayout on desktop:

- Logo on left
- Module name next to logo
- Settings on right
- Full-width content area

## ⚙️ When to Use Which Layout

### Use **DashboardLayout** for:

- Managers and administrators
- Users accessing multiple modules
- Power users who need navigation
- Team leads coordinating work

### Use **MinimalLayout** for:

- Specialists focused on one task
- Temporary/contractor roles
- Kiosk-mode or shared terminals
- Mobile-first users
- Reduced clutter preference

## 📊 Performance

Both layouts have identical performance:

- Same permission checking
- Same data fetching
- Only CSS/layout difference
- No additional bundle size

**MinimalLayout**: ~2KB additional code (minimal components only)

## 🚀 Migration Path

1. **Today**: Both layouts available
2. **Week 1**: Test MinimalLayout with pilot users
3. **Week 2**: Enable for all job managers
4. **Week 3**: Roll out to other specialist roles
5. **Ongoing**: Fine-tune based on feedback

## 📞 Support & Troubleshooting

**Issue**: MinimalLayout shows full nav
**Solution**: Check user role/permission config in global layout

**Issue**: Cannot access page in MinimalLayout
**Solution**: Verify permission is in user's `allowedPaths`

**Issue**: Module name incorrect
**Solution**: Pathname parsing reads `/dashboard/{module}/...`

---

**Need Help?** Check the comprehensive implementation guide at:
`/IOTADashboard/PERMISSION_SYSTEM_IMPLEMENTATION.md`
