# Security Analysis & Hardening Recommendations

## Current Security State: ⚠️ CRITICAL VULNERABILITIES IDENTIFIED

### Executive Summary

**Current Implementation:** Frontend-only permission checking
**Risk Level:** 🔴 **HIGH** - Unauthorized users can bypass frontend controls and access protected data directly via API calls

---

## 🔴 Critical Vulnerabilities

### 1. **NO BACKEND AUTHORIZATION** (CRITICAL)

**Current State:** Backend APIs have NO permission validation

- Example: `/expenses` API endpoint (line 1194 in supabase.ts)
  ```typescript
  export const getExpenses = api(
    { expose: true, method: "GET", path: "/expenses" },
    async (): Promise<expensesResponse> => {
      // ❌ NO permission check - anyone with valid auth token can call this
      // ❌ NO user context validation
      // ❌ NO role-based access control
    }
  );
  ```

**Exploit Scenario:**

1. Attacker obtains valid JWT token (via session hijacking, XSS, stolen credentials)
2. Calls API directly: `curl -H "Authorization: Bearer <token>" https://api.iotatechnologies.io/expenses`
3. **Gets ALL expense data** regardless of frontend permissions ❌

**Impact:**

- ✅ Frontend blocks UI rendering (your current fix)
- ❌ But API still returns sensitive data to unauthorized users
- ❌ Attackers can use Postman, curl, or browser console to bypass frontend entirely

---

### 2. **Session Hijacking** (HIGH)

**Vulnerabilities:**

- Tokens stored in localStorage (can be accessed via XSS)
- No httpOnly cookies
- No secure token rotation
- 30-second cache means stolen token valid for 30 seconds minimum

**Exploit Scenario:**

1. XSS attack injects malicious script
2. Script reads `localStorage.getItem('accessToken')`
3. Sends token to attacker's server
4. Attacker uses token to call APIs directly

---

### 3. **LocalStorage Manipulation** (MEDIUM)

**Current State:** Permissions cached in localStorage

```javascript
// User can manipulate this in browser console:
localStorage.setItem(
  "userNavPermissions",
  JSON.stringify({
    "user@example.com": ["/dashboard/expense", "/dashboard/invoice"],
  })
);
```

**Impact:**

- ✅ Backend API call will still return correct permissions (your current fix)
- ❌ But UI might render incorrectly before API call completes
- ⚠️ Creates confusing UX and potential race conditions

---

### 4. **Direct API Access** (CRITICAL)

**Tools attackers can use:**

- Browser DevTools Network tab (copy as cURL)
- Postman / Insomnia
- Python requests library
- Custom scripts

**Example Attack:**

```bash
# 1. User logs in normally
# 2. Opens DevTools, copies Authorization header
# 3. Runs from terminal:
curl -X GET 'https://staging-iotaapiserver-s572.encr.app/expenses' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'apikey: your-supabase-key'

# Result: Gets ALL expenses regardless of frontend permissions ❌
```

---

### 5. **CORS Misconfiguration** (MEDIUM)

**Risk:** If CORS is too permissive, malicious sites can call your APIs

---

### 6. **No Rate Limiting** (MEDIUM)

**Risk:**

- Brute force attacks
- API abuse
- DDoS vulnerabilities
- No throttling on permission checks

---

### 7. **No Request Validation** (HIGH)

**Issues:**

- No input sanitization
- No schema validation on API requests
- SQL injection risk (if constructing queries manually)
- XSS risk in stored data

---

## ✅ Recommended Security Hardening

### **Priority 1: Backend Authorization (CRITICAL - Implement Immediately)**

#### A. Create Permission Middleware

Create `/iotaapiserver/iotaapiserver/middleware/permissions.ts`:

```typescript
import { APIError } from "encore.dev/api";
import axios from "axios";

interface UserContext {
  email: string;
  userId: string;
  role: string;
  roleId: number;
}

interface PermissionCheck {
  requiredPath: string;
  requiredRole?: string[];
  allowSuperAdmin?: boolean;
}

const apiUrl = process.env.SUPABASE_URL;
const apiKey = process.env.SUPABASE_KEY;

// Cache for user permissions (TTL: 30 seconds)
const permissionCache = new Map<string, { paths: string[]; expiry: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Check if user has permission to access a specific path
 */
export async function checkPermission(
  user: UserContext,
  check: PermissionCheck
): Promise<boolean> {
  // SuperAdmin bypass
  if (check.allowSuperAdmin !== false && user.roleId === 4) {
    return true;
  }

  // Role-based check (if specified)
  if (check.requiredRole && !check.requiredRole.includes(user.role)) {
    return false;
  }

  // Path-based permission check
  const userPaths = await getUserPermissions(user.email);

  // Check if user has permission for this path
  return userPaths.some(
    (allowedPath) =>
      check.requiredPath === allowedPath ||
      check.requiredPath.startsWith(`${allowedPath}/`)
  );
}

/**
 * Get user permissions from database (with caching)
 */
async function getUserPermissions(userEmail: string): Promise<string[]> {
  const cached = permissionCache.get(userEmail);
  if (cached && cached.expiry > Date.now()) {
    return cached.paths;
  }

  try {
    const response = await axios.get(
      `${apiUrl}/userNavPermissions?userId=eq.${encodeURIComponent(
        userEmail
      )}&enabled=eq.true`,
      {
        headers: {
          apikey: apiKey!,
          Authorization: `Bearer ${apiKey!}`,
        },
      }
    );

    // Get navPermission paths from joined data
    const permissions = response.data || [];
    const paths: string[] = [];

    for (const perm of permissions) {
      const navPermResponse = await axios.get(
        `${apiUrl}/navPermissions?id=eq.${perm.navPermissionId}`,
        {
          headers: {
            apikey: apiKey!,
            Authorization: `Bearer ${apiKey!}`,
          },
        }
      );

      if (navPermResponse.data[0]?.path) {
        paths.push(navPermResponse.data[0].path);
      }
    }

    // Cache the result
    permissionCache.set(userEmail, {
      paths,
      expiry: Date.now() + CACHE_TTL,
    });

    return paths;
  } catch (error) {
    console.error("[Permission Check] Failed to fetch permissions:", error);
    return []; // Fail closed - deny access on error
  }
}

/**
 * Middleware decorator to protect API endpoints
 */
export function requirePermission(path: string, roles?: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract user context from request
      // Note: Adjust this based on your auth implementation
      const userEmail = args[0]?.email; // Assuming first arg has user context
      const userRole = args[0]?.role;
      const userRoleId = args[0]?.roleId;

      if (!userEmail) {
        throw APIError.unauthenticated("User not authenticated");
      }

      const hasPermission = await checkPermission(
        {
          email: userEmail,
          userId: userEmail,
          role: userRole,
          roleId: userRoleId,
        },
        { requiredPath: path, requiredRole: roles }
      );

      if (!hasPermission) {
        throw APIError.permissionDenied(
          `Access denied. Required permission: ${path}`
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

#### B. Update API Endpoints to Require Permission

Update `/iotaapiserver/supabase/supabase.ts`:

```typescript
import { requirePermission } from "../middleware/permissions";

// Before:
export const getExpenses = api(
  { expose: true, method: "GET", path: "/expenses" },
  async (): Promise<expensesResponse> => {
    // No permission check ❌
  }
);

// After:
export const getExpenses = api(
  { expose: true, method: "GET", path: "/expenses", auth: true }, // Add auth requirement
  async (req: {
    userEmail: string;
    role: string;
    roleId: number;
  }): Promise<expensesResponse> => {
    // Validate permission
    const hasPermission = await checkPermission(
      {
        email: req.userEmail,
        userId: req.userEmail,
        role: req.role,
        roleId: req.roleId,
      },
      {
        requiredPath: "/dashboard/expense",
        requiredRole: ["manager", "admin", "superAdmin"],
      }
    );

    if (!hasPermission) {
      throw APIError.permissionDenied(
        "You don't have permission to view expenses"
      );
    }

    // Original logic...
  }
);
```

#### C. Apply to ALL Protected Endpoints

Endpoints that MUST have permission checks:

- ✅ `/expenses` (GET, POST, PUT, DELETE)
- ✅ `/invoices` (GET, POST, PUT, DELETE)
- ✅ `/vendors` (GET, POST, PUT, DELETE)
- ✅ `/bdms` (GET, POST, PUT, DELETE)
- ✅ `/payroll/*` (ALL methods)
- ✅ `/deals/*` (ALL methods)
- ✅ `/user-nav-permissions/*` (Admin only)

---

### **Priority 2: Secure Token Management**

#### A. Use HTTP-Only Cookies (Instead of localStorage)

**Frontend:** Update auth provider to use cookies

```javascript
// Set token in HTTP-only cookie (server-side)
document.cookie = `accessToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`;

// Remove localStorage usage
// localStorage.setItem('accessToken', token); ❌
```

**Backend:** Read token from cookie

```typescript
export const getExpenses = api(
  { expose: true, method: "GET", path: "/expenses" },
  async (req): Promise<expensesResponse> => {
    // Extract token from cookie header
    const token = extractTokenFromCookie(req.headers.cookie);
    // Validate and decode
  }
);
```

#### B. Implement Token Rotation

- Refresh tokens every 15 minutes
- Invalidate old tokens on logout
- Track active sessions in database

#### C. Add Token Validation

```typescript
function validateToken(token: string): UserContext {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      email: decoded.email,
      userId: decoded.sub,
      role: decoded.role,
      roleId: decoded.roleId,
    };
  } catch (error) {
    throw APIError.unauthenticated("Invalid or expired token");
  }
}
```

---

### **Priority 3: Additional Security Layers**

#### A. Implement Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});

// Apply to all API routes
app.use("/api/", apiLimiter);
```

#### B. Add Request Validation (Use Zod or Joi)

```typescript
import { z } from "zod";

const CreateExpenseSchema = z.object({
  expenseAmount: z.number().positive().max(1000000),
  expenseType: z.string().uuid(),
  description: z.string().min(1).max(500),
  // ... more fields
});

export const createExpense = api(
  { expose: true, method: "POST", path: "/expenses" },
  async (req: createExpenseRequest): Promise<{ expense: expense }> => {
    // Validate input
    const validatedData = CreateExpenseSchema.parse(req);
    // Continue...
  }
);
```

#### C. Configure CORS Properly

```typescript
app.use(
  cors({
    origin: [
      "https://dashboard.iotatechnologies.io",
      "https://staging-dashboard.iotatechnologies.io",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

#### D. Add Security Headers

```typescript
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

#### E. Implement Audit Logging

```typescript
async function logAccess(
  user: UserContext,
  action: string,
  resource: string,
  success: boolean
) {
  await supabase.from("audit_logs").insert({
    user_email: user.email,
    action,
    resource,
    success,
    timestamp: new Date().toISOString(),
    ip_address: req.ip,
    user_agent: req.headers["user-agent"],
  });
}
```

---

## 🛠️ Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)

- [ ] Implement backend permission middleware
- [ ] Add permission checks to ALL expense endpoints
- [ ] Add permission checks to ALL invoice endpoints
- [ ] Add permission checks to ALL vendor endpoints
- [ ] Move tokens to HTTP-only cookies
- [ ] Test with revoked user scenario

### Phase 2: High Priority (Week 2)

- [ ] Add permission checks to remaining endpoints (BDM, payroll, deals)
- [ ] Implement token validation and rotation
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Add request validation (Zod schemas)

### Phase 3: Enhanced Security (Week 3-4)

- [ ] Implement security headers (Helmet)
- [ ] Add audit logging
- [ ] Set up intrusion detection
- [ ] Implement IP whitelisting for admin operations
- [ ] Add MFA for sensitive operations
- [ ] Security audit and penetration testing

---

## 🔍 Testing Security

### Test 1: Direct API Call (Should FAIL)

```bash
# 1. Log in as regular user with NO expense permission
# 2. Get token from DevTools
# 3. Try to access expenses directly
curl -X GET 'https://staging-iotaapiserver-s572.encr.app/expenses' \
  -H 'Authorization: Bearer <token>'

# Expected: 403 Forbidden - "You don't have permission to view expenses"
# Current: 200 OK with ALL expense data ❌
```

### Test 2: LocalStorage Manipulation (Should NOT Work)

```javascript
// In browser console:
localStorage.setItem(
  "userNavPermissions",
  JSON.stringify({
    "user@example.com": ["/dashboard/expense"],
  })
);
// Refresh page
// Try to access expense page

// Expected: Backend API still denies access (403)
// Current: Frontend shows loading then 403 ✅ (your fix works for frontend)
```

### Test 3: Session Hijacking Simulation

```bash
# 1. User A logs in, gets token
# 2. Attacker steals token via XSS
# 3. Attacker tries to use token

# Expected: Token should be invalidated or have very short TTL
# Current: Token works until expiry (30+ minutes?) ❌
```

---

## 📊 Security Comparison

| Attack Vector         | Current State                      | After Hardening                                 |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| **Direct API Access** | ❌ Vulnerable - No backend checks  | ✅ Protected - Middleware validates permissions |
| **Session Hijacking** | ❌ High Risk - localStorage tokens | ✅ Mitigated - HTTP-only cookies + rotation     |
| **XSS Attacks**       | ❌ Tokens exposed                  | ✅ Protected - Tokens in secure cookies         |
| **CSRF**              | ⚠️ Unknown                         | ✅ Protected - CSRF tokens + SameSite           |
| **Brute Force**       | ❌ No rate limiting                | ✅ Protected - Rate limiting enabled            |
| **SQL Injection**     | ⚠️ Possible risk                   | ✅ Protected - Parameterized queries            |
| **Frontend Bypass**   | ❌ Easy to bypass                  | ✅ Irrelevant - Backend enforces rules          |

---

## 💰 Recommended Security Tools/SDKs

### 1. **Authentication & Authorization**

- **Auth0** (Recommended) - $23/month
  - Built-in RBAC
  - Token rotation
  - MFA support
  - Anomaly detection
- **Clerk** - $25/month

  - Modern auth UI
  - Session management
  - Webhooks for permission sync

- **Supabase Auth** (You're already using this)
  - Row-level security (RLS)
  - JWT validation
  - Need to implement RLS policies

### 2. **API Security**

- **Kong Gateway** - Open source / $495/month (enterprise)
  - Rate limiting
  - Request validation
  - API firewall
- **AWS API Gateway** - Pay per request
  - Built-in auth
  - Rate limiting
  - DDoS protection

### 3. **Web Application Firewall (WAF)**

- **Cloudflare WAF** - $200/month

  - DDoS protection
  - Bot management
  - Rate limiting
  - SSL/TLS

- **AWS WAF** - Pay per request
  - Customizable rules
  - Integration with CloudFront

### 4. **Security Monitoring**

- **Datadog Security Monitoring** - $31/host/month

  - Real-time threat detection
  - Audit logs
  - Compliance reporting

- **Sentry** - $26/month
  - Error tracking
  - Performance monitoring
  - Security alerts

### 5. **Input Validation**

- **Zod** (Free, TypeScript)
  - Schema validation
  - Type inference
  - Runtime checks

### 6. **Rate Limiting**

- **Upstash** (Serverless Redis) - $0.2/100K requests
  - Global rate limiting
  - Low latency
  - Easy integration

---

## ⚠️ CRITICAL NEXT STEPS

### **MUST DO IMMEDIATELY:**

1. ✅ Keep your frontend permission guard fix (already done)
2. 🔴 **Implement backend permission middleware** (Priority 1 - Start today)
3. 🔴 **Add permission checks to all expense/invoice/vendor endpoints**
4. 🟡 Move tokens to HTTP-only cookies
5. 🟡 Add rate limiting

### **Your Current Fix is 50% Effective:**

- ✅ Prevents UI rendering for unauthorized users
- ✅ Good UX - shows proper 403 page
- ❌ **Does NOT prevent API data access**
- ❌ Attackers can still call APIs directly and get data

### **Bottom Line:**

**Frontend security = UX protection, NOT data protection**

A determined attacker with basic knowledge can:

1. Open DevTools
2. Copy API request as cURL
3. Run from terminal
4. Get ALL data regardless of your frontend guards

**You MUST implement backend authorization to truly secure your system.**

---

## 🎯 Recommendation

Given your frustration with the permission system, I recommend:

1. **Quick Win (This Week):**

   - Implement basic backend permission middleware
   - Add to expense endpoints only
   - Test thoroughly
   - This solves your immediate security concern

2. **Complete Solution (Next 2-3 Weeks):**

   - Extend to all endpoints
   - Add token security improvements
   - Implement rate limiting
   - Add audit logging

3. **Consider Professional Security Audit:**
   - Hire security consultant for penetration testing
   - Cost: $3,000-$10,000 for comprehensive audit
   - Identifies ALL vulnerabilities
   - Provides remediation roadmap

**Would you like me to implement the backend permission middleware first?**
