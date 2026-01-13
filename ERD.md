# Entity Relationship Diagram (ERD) for Scholarship Tracking System

```mermaid
erDiagram
    users {
        int id PK
        string email UK
        string password
        string firstName
        string lastName
        string role
        boolean isActive
        int studentId FK
        datetime createdAt
        datetime updatedAt
    }

    user_applications {
        int id PK
        int userId FK
        string status
        string remarks
        datetime createdAt
        datetime updatedAt
    }

    students {
        int id PK
        string firstName
        string middleName
        string lastName
        string yearLevel
        string course
        float tuitionFee
        string educationLevel
        int userId FK
        datetime createdAt
        datetime updatedAt
    }

    scholarships {
        int id PK
        string name
        string description
        string type
        string category
        float amount
        string eligibility
        datetime applicationStart
        datetime applicationEnd
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    student_scholarships {
        int id PK
        int studentId FK
        int scholarshipId FK
        string status
        datetime dateApplied
        datetime dateApproved
        string remarks
        datetime createdAt
        datetime updatedAt
    }

    users ||--o{ user_applications : "applies_for"
    users ||--|| students : "has_profile"
    students ||--o{ student_scholarships : "applies_for"
    scholarships ||--o{ student_scholarships : "awarded_to"
```

## Entity Descriptions

### users

- Main authentication table for system users
- Can have roles like admin, staff, or student
- Links to student profiles

### user_applications

- Tracks applications made by users to become students
- Status can be Pending, Approved, or Rejected

### students

- Student profile information
- Contains academic details like year level, course, tuition fee
- Links back to user account

### scholarships

- Scholarship information including name, description, type, amount
- Tracks application periods and eligibility criteria
- Can be categorized as Internal or External

### student_scholarships

- Junction table linking students to scholarships
- Tracks application status and approval dates
