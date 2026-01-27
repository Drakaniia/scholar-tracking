# ScholarTrack System Manual
## Scholarship Tracking System - Complete User Guide

**Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**System Type:** Web-based Application

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Requirements](#2-system-requirements)
3. [Getting Started](#3-getting-started)
4. [User Authentication](#4-user-authentication)
5. [Dashboard Overview](#5-dashboard-overview)
6. [Student Management](#6-student-management)
7. [Scholarship Management](#7-scholarship-management)
8. [Reports and Analytics](#8-reports-and-analytics)
9. [Data Export](#9-data-export)
10. [Database Management](#10-database-management)
11. [Troubleshooting](#11-troubleshooting)
12. [FAQs](#12-faqs)
13. [Technical Support](#13-technical-support)

---

## 1. Introduction

### 1.1 About ScholarTrack

ScholarTrack is a comprehensive web-based scholarship tracking system designed to streamline the management of student scholarships, financial aid, and related administrative tasks. The system provides an intuitive interface for managing student records, scholarship programs, and generating detailed reports.

### 1.2 Key Features

- **Student Management**: Complete CRUD operations for student records
- **Scholarship Programs**: Manage multiple scholarship types (PAED, CHED, LGU)
- **Fee Tracking**: Detailed breakdown of tuition, fees, and subsidies
- **Disbursement Tracking**: Monitor scholarship payments and distributions
- **Reports & Analytics**: Generate comprehensive reports with export capabilities
- **User Authentication**: Secure login with role-based access control
- **Audit Logging**: Track all system activities for accountability

### 1.3 User Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **ADMIN** | Full access | Complete system control, user management |
| **STAFF** | Read/Write | Manage students and scholarships |
| **VIEWER** | Read-only | View reports and data only |

---

## 2. System Requirements

### 2.1 Hardware Requirements

**Minimum:**
- Processor: Intel Core i3 or equivalent
- RAM: 4 GB
- Storage: 10 GB available space
- Internet: Broadband connection (1 Mbps+)

**Recommended:**
- Processor: Intel Core i5 or higher
- RAM: 8 GB or more
- Storage: 20 GB SSD
- Internet: High-speed connection (5 Mbps+)

### 2.2 Software Requirements

**Client Side:**
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- Cookies enabled
- Screen resolution: 1366x768 or higher

**Server Side (For Administrators):**
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm or yarn package manager

### 2.3 Supported Browsers

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Google Chrome | 90+ | ✅ Fully Supported |
| Mozilla Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Microsoft Edge | 90+ | ✅ Fully Supported |
| Internet Explorer | Any | ❌ Not Supported |

---

## 3. Getting Started

### 3.1 Accessing the System

1. Open your web browser
2. Navigate to: `https://scholar-tracking-drakaniias-projects.vercel.app`
3. You will be redirected to the login page

### 3.2 First-Time Setup (Administrators)

```bash
# 1. Clone the repository
git clone <repository-url>
cd scholarship-tracking-system

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Create .env file with:
DATABASE_URL="postgresql://user:password@localhost:5432/scholarship_db"
JWT_SECRET="your-secure-secret-key-min-32-characters"

# 4. Setup database
npx prisma db push
npx prisma db seed

# 5. Start development server
npm run dev

# 6. Access at http://localhost:3000
```

### 3.3 Default Credentials

**Administrator Account:**
- Username: `admin`
- Password: `admin123`

**Staff Account:**
- Username: `staff`
- Password: `staff123`

⚠️ **IMPORTANT**: Change these passwords immediately after first login!

---

## 4. User Authentication

### 4.1 Logging In

1. Navigate to the login page
2. Enter your username
3. Enter your password
4. Click the "LOGIN" button
5. Upon successful authentication, you'll be redirected to the dashboard

### 4.2 Password Requirements

- Minimum 8 characters
- At least one uppercase letter (recommended)
- At least one number (recommended)
- At least one special character (recommended)

### 4.3 Session Management

- Sessions expire after 8 hours of inactivity
- You'll be automatically logged out after session expiration
- Multiple concurrent sessions are allowed
- Session data is stored securely with HTTP-only cookies

### 4.4 Logging Out

1. Click your username in the sidebar
2. Select "Logout" from the menu
3. You'll be redirected to the login page
4. Your session will be terminated

### 4.5 Account Lockout

- After 5 failed login attempts, your account will be locked for 15 minutes
- Contact an administrator if you need immediate access
- Lockout duration can be configured by administrators

---

## 5. Dashboard Overview

### 5.1 Dashboard Layout

The dashboard provides a comprehensive overview of the system:

```
┌─────────────────────────────────────────────────────┐
│  ScholarTrack Logo    [Dashboard] [Students] [...]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📊 Statistics Cards                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Total    │ │ Active   │ │ Total    │           │
│  │ Students │ │ Scholars │ │ Awarded  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                      │
│  📈 Recent Activity                                  │
│  ┌────────────────────────────────────────────┐    │
│  │ Recent Students with Scholarships          │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  📊 Distribution Charts                              │
│  ┌────────────────┐ ┌────────────────┐            │
│  │ By Grade Level │ │ By Scholarship │            │
│  └────────────────┘ └────────────────┘            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.2 Statistics Cards

**Total Students**
- Shows the total number of students in the system
- Displays count of students with scholarships

**Active Scholarships**
- Number of currently active scholarship programs
- Total scholarship programs available

**Total Awarded**
- Total amount of scholarship funds awarded
- Displayed in Philippine Peso (₱)

**Total Disbursed**
- Total amount of funds disbursed to students
- Tracks actual payments made

### 5.3 Navigation Menu

**Main Menu Items:**
- 🏠 **Dashboard**: System overview and statistics
- 👥 **Students**: Student management module
- 🎓 **Scholarships**: Scholarship program management
- 📊 **Reports**: Detailed reports and analytics

### 5.4 Quick Actions

- Export data from any module
- Add new students or scholarships
- View detailed reports
- Access database visualizations

---

## 6. Student Management

### 6.1 Viewing Students

**To view the student list:**
1. Click "Students" in the navigation menu
2. The student list will display with the following columns:
   - Student No.
   - Name (Last, First, M.I.)
   - Grade Level
   - Year Level
   - Program
   - Status
   - Scholarships
   - Actions

### 6.2 Adding a New Student

**Step-by-step process:**

1. Click the "Add Student" button
2. Fill in the required fields:
   - **Student No.**: Unique identifier (e.g., 2024-001)
   - **Last Name**: Student's surname
   - **First Name**: Student's given name
   - **Middle Initial**: Optional middle initial
   - **Program**: Course or program (e.g., BSIT, BSED)
   - **Grade Level**: Select from:
     - Grade School
     - Junior High
     - Senior High
     - College
   - **Year Level**: (e.g., 1st Year, Grade 7)
   - **Status**: Active or Inactive

3. Click "Save" to create the student record
4. A success message will appear
5. The student will appear in the list

### 6.3 Editing Student Information

**To edit a student:**

1. Locate the student in the list
2. Click the pencil (✏️) icon in the Actions column
3. Modify the desired fields
4. Click "Update" to save changes
5. Confirm the success message

### 6.4 Deleting a Student

**To delete a student:**

1. Locate the student in the list
2. Click the trash (🗑️) icon in the Actions column
3. Confirm the deletion in the popup dialog
4. The student record will be permanently removed

⚠️ **Warning**: Deleting a student will also remove:
- Associated fee records
- Disbursement history
- This action cannot be undone!

### 6.5 Assigning Scholarships

**To assign a scholarship to a student:**

1. Edit the student record
2. Select a scholarship from the dropdown
3. Enter additional details:
   - Award Date
   - Start Term
   - End Term
   - Grant Amount
   - Scholarship Status (Active/Completed/Suspended)
4. Save the changes

### 6.6 Searching and Filtering

**Search Options:**
- Search by name
- Search by student number
- Search by program

**Filter Options:**
- Filter by grade level
- Filter by scholarship status
- Filter by active/inactive status

**To use search:**
1. Enter search term in the search box
2. Results update automatically
3. Clear search to view all students

**To use filters:**
1. Click the filter dropdown
2. Select desired filter criteria
3. Click "Apply" to filter results
4. Click "Clear" to reset filters

---

## 7. Scholarship Management

### 7.1 Viewing Scholarships

**To view scholarships:**
1. Click "Scholarships" in the navigation menu
2. View the list with columns:
   - Scholarship Name
   - Sponsor
   - Type (PAED, CHED, LGU)
   - Amount
   - Students (count)
   - Status
   - Actions

### 7.2 Scholarship Types

**PAED (Private Education Assistance)**
- Sponsored by private education institutions
- Typically covers tuition and fees
- May have specific eligibility requirements

**CHED (Commission on Higher Education)**
- Government-funded scholarships
- For college students
- Merit-based or need-based

**LGU (Local Government Unit)**
- Funded by local government
- For residents of specific areas
- Various eligibility criteria

### 7.3 Adding a New Scholarship

**Step-by-step process:**

1. Click "Add Scholarship" button
2. Fill in the required information:
   - **Scholarship Name**: Full name of the program
   - **Sponsor**: Organization providing the scholarship
   - **Type**: Select PAED, CHED, or LGU
   - **Amount**: Scholarship amount in pesos
   - **Requirements**: Eligibility criteria (optional)
   - **Status**: Active or Inactive

3. Click "Create" to save
4. Verify the success message
5. Scholarship appears in the list

### 7.4 Editing Scholarships

**To edit a scholarship:**

1. Find the scholarship in the list
2. Click the edit (✏️) icon
3. Modify the fields as needed
4. Click "Update" to save
5. Confirm the changes

### 7.5 Deleting Scholarships

**To delete a scholarship:**

1. Locate the scholarship
2. Click the delete (🗑️) icon
3. Review the warning message
4. Confirm deletion

⚠️ **Warning**: If students are assigned to this scholarship:
- You'll see a warning with the student count
- Consider reassigning students first
- Deletion will remove scholarship assignments

### 7.6 Viewing Scholarship Details

**To view details:**
1. Click on the scholarship name
2. View comprehensive information:
   - Full description
   - Eligibility requirements
   - Amount and terms
   - List of recipients
   - Disbursement history

---

## 8. Reports and Analytics

### 8.1 Accessing Reports

1. Click "Reports" in the navigation menu
2. View the detailed scholarship report interface

### 8.2 Report Types

**Detailed Student Scholarship Report**
- Organized by grade level
- Grouped by scholarship type
- Shows complete fee breakdown
- Includes subsidy calculations

**Report Sections:**
- Grade School students
- Junior High students
- Senior High students
- College students

### 8.3 Report Data Columns

Each report includes:

| Column | Description |
|--------|-------------|
| Student No. | Unique student identifier |
| Last Name | Student's surname |
| First Name | Student's given name |
| M.I. | Middle initial |
| Year Level | Current year/grade |
| Tuition Fee | Tuition amount |
| Other Fees | Additional fees |
| Miscellaneous | Misc. charges |
| Laboratory | Lab fees |
| Total Fees | Sum of all fees |
| Subsidy Amount | Scholarship amount |
| % Subsidy | Percentage covered |

### 8.4 Viewing Reports by Grade Level

**To view specific grade level:**
1. Click the grade level tab:
   - Grade School
   - Junior High
   - Senior High
   - College
2. View students grouped by scholarship type
3. See totals for each scholarship group

### 8.5 Understanding Report Calculations

**Total Fees Calculation:**
```
Total Fees = Tuition + Other Fees + Miscellaneous + Laboratory
```

**Subsidy Percentage Calculation:**
```
% Subsidy = (Subsidy Amount / Total Fees) × 100
```

**Example:**
- Total Fees: ₱50,000
- Subsidy Amount: ₱30,000
- % Subsidy: 60%

---

## 9. Data Export

### 9.1 Export Options

ScholarTrack supports three export formats:
- **PDF**: For printing and sharing
- **Excel (XLSX)**: For data analysis
- **CSV**: For importing to other systems

### 9.2 Exporting Student Reports

**To export student data:**

1. Navigate to Students or Reports page
2. Click the "Export" button
3. Select your preferred format:
   - Export as PDF
   - Export as Excel
   - Export as CSV
4. The file will download automatically
5. Open the file with appropriate software

### 9.3 Export File Contents

**Student Export includes:**
- All student information
- Scholarship assignments
- Fee breakdowns
- Subsidy calculations
- Organized by grade level and scholarship type

**Scholarship Export includes:**
- Scholarship details
- Sponsor information
- Amount and type
- Number of recipients
- Status information

### 9.4 PDF Export Features

- Professional formatting
- Landscape orientation for detailed reports
- Color-coded headers
- Grouped by grade level and scholarship type
- Includes totals and summaries
- Generated timestamp

### 9.5 Excel Export Features

- Multiple sheets (one per grade level)
- Formatted headers
- Calculated totals
- Proper column widths
- Currency formatting
- Ready for pivot tables and analysis

### 9.6 CSV Export Features

- Plain text format
- Compatible with all spreadsheet software
- Easy to import to other systems
- Includes all data fields
- UTF-8 encoding

---

## 10. Database Management

### 10.1 Prisma Studio

**Accessing Prisma Studio:**
```bash
npx prisma studio
```

**Features:**
- Visual database browser
- Edit records directly
- View relationships
- Filter and search data
- Export individual tables

**Use Cases:**
- Quick data inspection
- Manual data corrections
- Testing database queries
- Debugging data issues

### 10.2 Database ERD Visualization

**Viewing the ERD:**
```bash
npm run erd:view
```

**Features:**
- Interactive diagram
- Zoom controls
- Table relationships
- Download as SVG
- Forest theme visualization

**Regenerating ERD:**
```bash
npm run erd:generate
```

### 10.3 Database Backup

**Manual Backup:**
```bash
pg_dump -U username -d scholarship_db > backup.sql
```

**Restore from Backup:**
```bash
psql -U username -d scholarship_db < backup.sql
```

**Recommended Backup Schedule:**
- Daily: Automated backups
- Weekly: Full database export
- Monthly: Archive backups

### 10.4 Database Maintenance

**Regular Tasks:**
1. Monitor database size
2. Check for orphaned records
3. Verify data integrity
4. Update statistics
5. Vacuum and analyze tables

**PostgreSQL Maintenance:**
```bash
# Vacuum database
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('scholarship_db'));

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 11. Troubleshooting

### 11.1 Login Issues

**Problem: Cannot login**

**Solutions:**
1. Verify username and password
2. Check Caps Lock is off
3. Clear browser cache and cookies
4. Try a different browser
5. Check if account is locked (wait 15 minutes)
6. Contact administrator for password reset

**Problem: Session expires too quickly**

**Solutions:**
1. Check system time is correct
2. Ensure cookies are enabled
3. Don't use incognito/private mode
4. Contact administrator to adjust session timeout

### 11.2 Data Display Issues

**Problem: Data not loading**

**Solutions:**
1. Refresh the page (F5)
2. Check internet connection
3. Clear browser cache
4. Try a different browser
5. Check browser console for errors

**Problem: Images not displaying**

**Solutions:**
1. Check internet connection
2. Disable ad blockers
3. Clear browser cache
4. Verify image files exist on server

### 11.3 Export Issues

**Problem: Export fails or downloads empty file**

**Solutions:**
1. Check if data exists to export
2. Try a different export format
3. Disable popup blockers
4. Check browser download settings
5. Try a different browser

**Problem: PDF formatting issues**

**Solutions:**
1. Use landscape orientation
2. Adjust zoom level
3. Try printing to PDF instead
4. Use Excel export as alternative

### 11.4 Performance Issues

**Problem: System is slow**

**Solutions:**
1. Close unnecessary browser tabs
2. Clear browser cache
3. Check internet speed
4. Reduce number of records displayed
5. Use filters to limit data
6. Contact administrator about server resources

### 11.5 Database Issues

**Problem: Data not saving**

**Solutions:**
1. Check required fields are filled
2. Verify data format is correct
3. Check for duplicate entries
4. Review validation errors
5. Contact administrator

**Problem: Missing data**

**Solutions:**
1. Check filters are not hiding data
2. Verify search terms
3. Check if data was deleted
4. Review audit logs
5. Contact administrator for data recovery

---

## 12. FAQs

### 12.1 General Questions

**Q: Who can access the system?**
A: Only authorized users with valid credentials can access ScholarTrack.

**Q: Is my data secure?**
A: Yes, all data is encrypted and stored securely. Access is logged and monitored.

**Q: Can I access the system from mobile devices?**
A: Yes, the system is responsive and works on tablets and smartphones.

**Q: How often is data backed up?**
A: Data is backed up daily automatically. Contact your administrator for specific backup schedules.

### 12.2 Student Management

**Q: Can I import students from Excel?**
A: Currently, students must be added individually. Bulk import feature is planned for future releases.

**Q: What happens if I delete a student by mistake?**
A: Deletions are permanent. Contact your administrator immediately for potential data recovery from backups.

**Q: Can a student have multiple scholarships?**
A: Currently, each student can be assigned to one scholarship at a time.

**Q: How do I track scholarship history?**
A: View the student's record to see scholarship assignment history and disbursements.

### 12.3 Scholarship Management

**Q: Can I create custom scholarship types?**
A: Currently, the system supports PAED, CHED, and LGU types. Custom types may be added by administrators.

**Q: How do I handle scholarship renewals?**
A: Update the scholarship assignment with new start/end terms and adjust the status.

**Q: Can scholarship amounts vary by student?**
A: Yes, the grant amount can be customized per student assignment.

### 12.4 Reports and Exports

**Q: Can I customize report layouts?**
A: Report layouts are standardized. Contact your administrator for custom report requests.

**Q: How long does it take to generate reports?**
A: Most reports generate instantly. Large datasets may take a few seconds.

**Q: Can I schedule automatic reports?**
A: Automatic report scheduling is not currently available but is planned for future releases.

**Q: What's the maximum export size?**
A: There's no hard limit, but very large exports (10,000+ records) may take longer to generate.

---

## 13. Technical Support

### 13.1 Contact Information

**System Administrator:**
- Email: admin@scholarship.edu
- Phone: (Contact your institution)
- Office Hours: Monday-Friday, 8:00 AM - 5:00 PM

**Technical Support:**
- Email: support@scholarship.edu
- Response Time: Within 24 hours
- Emergency: Contact system administrator directly

### 13.2 Reporting Issues

**When reporting an issue, please include:**
1. Your username (not password!)
2. Date and time of the issue
3. What you were trying to do
4. Error messages (screenshot if possible)
5. Browser and version
6. Steps to reproduce the issue

**Issue Priority Levels:**
- **Critical**: System down, cannot login
- **High**: Major feature not working
- **Medium**: Minor feature issue
- **Low**: Cosmetic or enhancement request

### 13.3 Feature Requests

**To request a new feature:**
1. Email your request to support
2. Describe the feature in detail
3. Explain the business need
4. Provide examples if possible
5. Feature requests are reviewed quarterly

### 13.4 Training and Documentation

**Available Resources:**
- This System Manual
- Video tutorials (coming soon)
- Quick reference guides
- Database ERD documentation
- API documentation (for developers)

**Training Sessions:**
- New user orientation
- Advanced features training
- Administrator training
- Custom training available upon request

### 13.5 System Updates

**Update Schedule:**
- Minor updates: Monthly
- Major updates: Quarterly
- Security patches: As needed
- Maintenance windows: Announced 1 week in advance

**Update Notifications:**
- Email notifications to all users
- In-system announcements
- Changelog available in documentation

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current form |
| `Esc` | Close dialog/modal |
| `Ctrl + F` | Focus search box |
| `+` or `=` | Zoom in (ERD viewer) |
| `-` | Zoom out (ERD viewer) |
| `0` | Reset zoom (ERD viewer) |

---

## Appendix B: Data Validation Rules

### Student Number Format
- Pattern: `YYYY-NNN` (e.g., 2024-001)
- Must be unique
- Required field

### Name Fields
- Minimum 2 characters
- Maximum 50 characters
- Letters, spaces, and hyphens only
- Required fields

### Amount Fields
- Must be positive numbers
- Maximum 2 decimal places
- Currency: Philippine Peso (₱)

### Date Fields
- Format: MM/DD/YYYY
- Must be valid dates
- Award date cannot be in the future

---

## Appendix C: System Limits

| Item | Limit |
|------|-------|
| Maximum students | Unlimited |
| Maximum scholarships | Unlimited |
| Session timeout | 8 hours |
| File upload size | 10 MB |
| Export records | 50,000 per file |
| Concurrent users | 100 |
| Password attempts | 5 before lockout |
| Lockout duration | 15 minutes |

---

## Appendix D: Glossary

**Terms and Definitions:**

- **CRUD**: Create, Read, Update, Delete operations
- **ERD**: Entity Relationship Diagram
- **Disbursement**: Payment or distribution of scholarship funds
- **Subsidy**: Financial assistance provided by scholarship
- **Grade Level**: Educational level (Grade School, Junior High, Senior High, College)
- **Year Level**: Specific year within a grade level
- **Audit Log**: Record of system activities and changes
- **Session**: Period of authenticated access to the system

---

## Document Information

**Document Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Author:** ScholarTrack Development Team  
**Review Date:** July 27, 2026

**Revision History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | Jan 27, 2026 | Initial release | Dev Team |

---

**End of System Manual**

For the latest version of this manual, visit: [Documentation Repository](./docs/)

For technical documentation, see: [README.md](./README.md)
