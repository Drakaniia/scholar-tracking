# Role-Based Access Control (RBAC) Guide

## Overview
The Scholarship Tracking System now includes role-based access control to manage user permissions and restrict certain actions based on user roles.

## User Roles

### 1. ADMIN
- Full access to all features
- Can view, create, edit, and delete students and scholarships
- Can access the Settings page to manage users
- Can change user roles and status
- Cannot change their own role (security measure)

### 2. STAFF
- Read-only access to students and scholarships
- Can view all data but cannot create, edit, or delete records
- Cannot access the Settings page
- Cannot manage users

### 3. VIEWER
- Read-only access (same as STAFF)
- Intended for stakeholders who only need to view reports

## Default Accounts

After running the seed script, two default accounts are created:

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** ADMIN
- **Email:** admin@scholartrack.com

### User Account
- **Username:** `user`
- **Password:** `user123`
- **Role:** STAFF
- **Email:** user@scholartrack.com

## Features

### Settings Page (Admin Only)
- Located at `/settings`
- Only visible to users with ADMIN role
- Displays all system users in a table
- Allows admins to:
  - Change user roles (ADMIN, STAFF, VIEWER)
  - Change user status (ACTIVE, INACTIVE, SUSPENDED)
  - View last login times
  - See user creation dates

### Role-Based UI
- **Add Student/Scholarship buttons:** Only visible to ADMIN users
- **Edit/Delete actions:** Only visible to ADMIN users
- **Settings menu item:** Only visible to ADMIN users in the sidebar
- **Export functionality:** Available to all users

### Security Features
- Admins cannot change their own role
- API endpoints validate user roles before allowing operations
- Session-based authentication with JWT tokens
- Audit logging for all user actions

## Testing the RBAC System

### Test as Admin
1. Login with `admin` / `admin123`
2. Verify you can see:
   - Settings button in sidebar
   - Add Student/Scholarship buttons
   - Edit/Delete actions in tables
3. Navigate to Settings and change the `user` account role to ADMIN
4. Verify the change is reflected

### Test as Regular User
1. Login with `user` / `user123`
2. Verify you CANNOT see:
   - Settings button in sidebar
   - Add Student/Scholarship buttons
   - Edit/Delete actions in tables
3. Verify you CAN:
   - View all students and scholarships
   - Export data
   - Navigate between pages

### Test Role Change
1. Login as `admin`
2. Go to Settings
3. Change `user` role from STAFF to ADMIN
4. Logout and login as `user`
5. Verify `user` now has admin privileges

## API Endpoints

### User Management
- `GET /api/users` - List all users (Admin only)
- `PUT /api/users/[id]` - Update user role/status (Admin only)

### Protected Endpoints
All student and scholarship modification endpoints check for ADMIN role:
- `POST /api/students` - Create student (Admin only)
- `PUT /api/students/[id]` - Update student (Admin only)
- `DELETE /api/students/[id]` - Delete student (Admin only)
- `POST /api/scholarships` - Create scholarship (Admin only)
- `PUT /api/scholarships/[id]` - Update scholarship (Admin only)
- `DELETE /api/scholarships/[id]` - Delete scholarship (Admin only)

## Database Schema

The User model includes:
```prisma
model User {
  id                  Int       @id @default(autoincrement())
  username            String    @unique
  email               String    @unique
  passwordHash        String
  firstName           String
  lastName            String
  role                String    @default("STAFF") // ADMIN, STAFF, VIEWER
  status              String    @default("ACTIVE") // ACTIVE, INACTIVE, SUSPENDED
  lastLogin           DateTime?
  passwordChangedAt   DateTime  @default(now())
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

## Best Practices

1. **Change Default Passwords:** Immediately change the default admin password in production
2. **Regular Audits:** Review user roles and permissions regularly
3. **Principle of Least Privilege:** Assign the minimum role necessary for each user
4. **Monitor Activity:** Check audit logs for suspicious activity
5. **Secure Sessions:** Sessions expire after 8 hours of inactivity

## Troubleshooting

### Cannot see Settings page
- Verify you're logged in as an admin user
- Check the user's role in the database
- Clear browser cache and cookies

### Cannot edit/delete records
- Verify your user role is ADMIN
- Check if you're properly authenticated
- Review browser console for errors

### Role change not taking effect
- Logout and login again to refresh the session
- Verify the role was actually changed in the database
- Check for any API errors in the browser console
