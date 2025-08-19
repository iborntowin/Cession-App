# User Role Assignment Fix

## Problem
When normal users signed up through the signup page, they were incorrectly getting `ADMIN` role instead of `USER` role.

## Root Cause
In the `AuthService.java`, both the `registerUser()` and `signup()` methods were hardcoded to assign `ADMIN` role to all new users:

```java
user.setRole("ADMIN"); // This was wrong for regular signups
```

## Solution

### 1. Fixed AuthService Role Logic
Updated both methods to use intelligent role assignment:

```java
// Assign role based on whether this is the first user or not
long userCount = userRepository.count();
if (userCount == 0) {
    // First user gets ADMIN role
    user.setRole("ADMIN");
    logger.info("First user signup, assigning ADMIN role to: {}", signupRequest.getEmail());
} else {
    // Subsequent users get USER role by default
    user.setRole("USER");
    logger.info("Regular user signup, assigning USER role to: {}", signupRequest.getEmail());
}
```

### 2. Updated Security Configuration
Modified `SecurityConfig.java` to properly handle both `USER` and `ADMIN` roles:

**Admin-Only Endpoints:**
- `/api/v1/auth/users` - User management
- `/api/v1/auth/user/**` - User operations

**User + Admin Endpoints:**
- `/api/v1/clients/**` - Client management
- `/api/v1/cessions/**` - Cession management
- `/api/v1/payments/**` - Payment management
- `/api/v1/products/**` - Product management
- `/api/v1/expenses/**` - Expense management
- `/api/v1/income/**` - Income management
- And other core business endpoints

### 3. Role Assignment Logic

| Scenario | Role Assigned | Reason |
|----------|---------------|---------|
| Default User (Mousser@gmail.com) | `ADMIN` | System admin account |
| First signup (empty database) | `ADMIN` | Initial system setup |
| Subsequent signups | `USER` | Regular users |

### 4. Testing
Created comprehensive tests to verify:
- ✅ First user gets ADMIN role
- ✅ Subsequent users get USER role
- ✅ Multiple users get USER role
- ✅ Default user doesn't affect role assignment
- ✅ Role-based access control works correctly

## Files Modified

1. **`backend/src/main/java/com/example/cessionappbackend/services/AuthService.java`**
   - Fixed `registerUser()` method
   - Fixed `signup()` method
   - Added intelligent role assignment logic

2. **`backend/src/main/java/com/example/cessionappbackend/security/SecurityConfig.java`**
   - Updated authorization rules
   - Added `hasAnyRole("USER", "ADMIN")` for core endpoints
   - Kept admin-only endpoints restricted

3. **Test Files Created:**
   - `AuthServiceRoleTest.java` - Unit tests for role assignment
   - `test-user-roles.js` - Integration test script

## Verification

### Before Fix:
```
Normal User Signup → ADMIN role ❌
```

### After Fix:
```
Default User (Mousser@gmail.com) → ADMIN role ✅
First Signup (empty DB) → ADMIN role ✅
Normal User Signup → USER role ✅
```

## Usage

### For Regular Users:
1. Sign up through the normal signup page
2. Automatically get `USER` role
3. Access to all core business functionality
4. Cannot access user management features

### For Admins:
1. Use default admin account: `Mousser@gmail.com` / `123456`
2. Or be the first user to sign up
3. Full access to all features including user management

## Testing the Fix

Run the test script to verify role assignment:
```bash
# Start backend server
mvn spring-boot:run

# In another terminal
node test-user-roles.js
```

The fix ensures proper role-based access control while maintaining system security and usability.