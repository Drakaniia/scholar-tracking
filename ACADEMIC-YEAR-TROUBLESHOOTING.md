# Academic Year Creation Troubleshooting Guide

## Problem
Cannot create new academic years in the scholarship tracking system.

## Root Causes & Solutions

### 1. Authentication Issues
**Problem**: User not logged in or insufficient permissions
**Symptoms**: 
- API returns login page instead of JSON
- 401 Unauthorized or 403 Forbidden errors
- Changes not saving

**Solution**: 
- Ensure you're logged in with ADMIN or STAFF role
- Clear browser cookies and log in again
- Check user permissions in Settings page

### 2. Duplicate Academic Year
**Problem**: Academic year with the same year already exists
**Symptoms**: "Academic year already exists" error
**Solution**: 
- Check existing academic years first
- Use a different year format (e.g., "2025-2026" instead of "2024-2025")
- Delete existing academic year if it's a duplicate

### 3. Invalid Semester Format
**Problem**: Semester field not in expected format
**Symptoms**: "Invalid semester" error
**Solution**: 
- Use exactly "1ST", "2ND", or "3RD"
- Avoid variations like "First Semester" or "1st"

### 4. Date Format Issues
**Problem**: Dates not in YYYY-MM-DD format
**Symptoms**: "Invalid date" errors
**Solution**:
- Ensure dates are in format: "2024-06-01"
- Start date must be before end date
- Use valid calendar dates (no February 30th)

### 5. Frontend Form Validation
**Problem**: Form not submitting due to client-side validation
**Symptoms**: Submit button disabled, no API calls made
**Solution**:
- Fill all required fields
- Check that dates are properly formatted
- Ensure academic year preview shows correctly

## Step-by-Step Troubleshooting

### Step 1: Check Authentication
1. Open browser developer tools (F12)
2. Go to Network tab
3. Try creating an academic year
4. Look for API calls to `/api/academic-years`
5. If no calls appear, check form validation
6. If 401/403 errors, check login status

### Step 2: Check Browser Console
1. Open Console tab in developer tools
2. Look for JavaScript errors or warnings
3. Check for validation messages
4. Look for network request logs

### Step 3: Test API Directly
1. Copy the diagnostic script from `diagnose-academic-year.js`
2. Paste it in browser console while logged in
3. Follow the output to identify specific issues

### Step 4: Check Database
1. Look for existing academic years that might conflict
2. Verify database connection is working
3. Check for any database constraints violations

## Common Solutions

### Solution 1: Basic Academic Year Creation
```javascript
const academicYear = {
  year: "2025-2026",
  startDate: "2025-06-01", 
  endDate: "2026-05-31",
  semester: "1ST",
  isActive: false,
  promotionDate: "2026-05-31"
};
```

### Solution 2: Reset Form State
If the form seems stuck:
1. Refresh the page
2. Clear browser cache
3. Log out and log back in

### Solution 3: Check User Permissions
Only ADMIN and STAFF users can create academic years. VIEWER users cannot.

### Solution 4: Database Issues
If the issue persists:
1. Check database connection
2. Verify Prisma migrations are applied
3. Check for foreign key constraints

## Debugging Commands

### Check Server Logs
```bash
# Look at the development server console output
# Check for error messages when creating academic years
```

### Check Database
```bash
# Connect to your database and check existing academic years
SELECT * FROM academic_years ORDER BY created_at DESC;
```

### Browser Console Test
```javascript
// Run this in browser console to test API directly
const testData = {
  year: "2025-2026",
  startDate: "2025-06-01", 
  endDate: "2026-05-31",
  semester: "1ST",
  isActive: false,
  promotionDate: "2026-05-31"
};

fetch('/api/academic-years', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData),
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));
```

## Prevention

1. **Always use proper date formats** in forms
2. **Check for existing academic years** before creating new ones
3. **Use valid semester codes** (1ST, 2ND, 3RD only)
4. **Ensure proper user permissions** before attempting creation
5. **Test with different academic year ranges** to avoid conflicts

## If Nothing Works

1. Check the server console for detailed error logs
2. Verify database connectivity
3. Check if Prisma schema matches database structure
4. Try creating academic years with different data
5. Contact system administrator if database issues persist

## Enhanced Logging

The system now includes detailed logging to help identify issues:
- Check browser console for form submission logs
- Check server console for API processing logs
- All validation errors are logged with specific details

Run the diagnostic script to get a comprehensive analysis of what's failing in your specific case.