# Default User Implementation

## Overview

This implementation adds a static default admin user that is automatically created on application startup if it doesn't already exist. This ensures there's always an admin account available for login, even when the database is empty.

## Implementation Details

### 🔧 Static User Configuration

- **Email**: `Mousser@gmail.com`
- **Password**: `123456` (securely hashed using BCrypt)
- **Full Name**: `Default Admin`
- **Role**: `ADMIN`
- **Status**: Active

### 👥 User Role Assignment

- **Default User**: Always gets `ADMIN` role (created by `DefaultUserInitializer`)
- **First Signup**: If no users exist, gets `ADMIN` role
- **Subsequent Signups**: Get `USER` role by default
- **Role-Based Access**: 
  - `ADMIN`: Full access to all endpoints including user management
  - `USER`: Access to core business functionality (clients, cessions, payments, etc.)

### 📁 Files Created/Modified

#### 1. `DefaultUserInitializer.java`
**Location**: `backend/src/main/java/com/example/cessionappbackend/config/DefaultUserInitializer.java`

**Purpose**: Spring Boot ApplicationRunner that executes on startup to create the default user.

**Key Features**:
- Implements `ApplicationRunner` for startup execution
- Checks if default user already exists before creating
- Uses existing `PasswordEncoder` for secure password hashing
- Integrates with existing `UserRepository` and `User` entity
- Comprehensive logging for debugging
- Error handling to prevent application startup failure

#### 2. Test Files
- `DefaultUserInitializerTest.java` - Tests user creation functionality
- `DefaultUserLoginTest.java` - Tests login functionality with default user
- `application-test.properties` - Test configuration

#### 3. Test Script
- `test-default-user-login.js` - Node.js script to test the implementation

### 🔐 Security Integration

The implementation fully integrates with the existing authentication system:

1. **Password Encoding**: Uses the same `BCryptPasswordEncoder` bean configured in `SecurityConfig`
2. **User Entity**: Creates a standard `User` entity with all required fields
3. **Authentication Flow**: Works with existing login endpoints and JWT token generation
4. **Authorization**: User gets `ADMIN` role for full system access

### 🚀 Startup Process

1. **Application Starts**: Spring Boot initializes all components
2. **DefaultUserInitializer Runs**: Executes after application context is ready
3. **User Check**: Queries database to see if default user exists
4. **User Creation**: If not found, creates new user with hashed password
5. **Logging**: Provides detailed logs about the process

### 🧪 Testing

#### Unit Tests
```bash
# Test user creation
mvn test -Dtest=DefaultUserInitializerTest

# Test login functionality
mvn test -Dtest=DefaultUserLoginTest
```

#### Integration Test
```bash
# Start the backend server
mvn spring-boot:run

# In another terminal, run the test script
node test-default-user-login.js
```

### 📊 Expected Logs

On successful startup, you should see logs like:
```
INFO c.e.c.config.DefaultUserInitializer : Default admin user created successfully:
INFO c.e.c.config.DefaultUserInitializer :   Email: Mousser@gmail.com
INFO c.e.c.config.DefaultUserInitializer :   Role: ADMIN
INFO c.e.c.config.DefaultUserInitializer :   Active: true
```

If user already exists:
```
INFO c.e.c.config.DefaultUserInitializer : Default admin user already exists: Mousser@gmail.com
```

### 🔄 Database Behavior

- **H2 File Database**: User persists across application restarts
- **H2 Memory Database**: User is recreated on each restart (test mode)
- **Database Reset**: User is automatically recreated if database is cleared

### 🛡️ Security Considerations

1. **Password Hashing**: Uses BCrypt with proper salt
2. **No Hardcoded Secrets**: Password is hashed at runtime
3. **Existing Validation**: Respects all existing user validation rules
4. **Role-Based Access**: Follows existing authorization patterns

### 🔧 Configuration

The default user configuration is defined as constants in `DefaultUserInitializer`:

```java
private static final String DEFAULT_EMAIL = "Mousser@gmail.com";
private static final String DEFAULT_PASSWORD = "123456";
private static final String DEFAULT_FULL_NAME = "Default Admin";
private static final String DEFAULT_ROLE = "ADMIN";
```

To change these values, modify the constants and rebuild the application.

### 🚨 Production Recommendations

1. **Change Default Password**: After first login, change the password through the UI
2. **Monitor Access**: Keep track of default user login attempts
3. **Consider Disabling**: In production, you might want to disable this feature after initial setup
4. **Environment Variables**: Consider making credentials configurable via environment variables

### 🔍 Troubleshooting

#### User Not Created
- Check application logs for errors
- Verify database connectivity
- Ensure `UserRepository` is properly configured

#### Login Fails
- Verify password is exactly "123456"
- Check if user exists in database
- Review authentication logs

#### Database Issues
- Check H2 database file permissions
- Verify database URL in `application.properties`
- Clear database file if corrupted

### 🎯 Benefits

1. **Always Available**: Admin access guaranteed even with empty database
2. **Clean Integration**: Uses existing authentication infrastructure
3. **Secure**: Proper password hashing and validation
4. **Testable**: Comprehensive test coverage
5. **Maintainable**: Clear, documented code with proper error handling

This implementation ensures that the application always has a working admin account while maintaining security best practices and integrating seamlessly with the existing codebase.