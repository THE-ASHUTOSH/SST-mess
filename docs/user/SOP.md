# SST Mess Management System - Standard Operating Procedures (SOP)

**Version:** 1.0
**Last Updated:** February 2026
**Scope:** Administrators, Vendors, Students

---

## 1. Introduction

This **Standard Operating Procedure (SOP)** document outlines the step-by-step protocols for managing the SST Mess Management System. It serves as the primary reference for daily operations, data management, and troubleshooting.

**Objectives:**
*   Ensure accurate meal tracking and billing.
*   Standardize the vendor onboarding and menu management process.
*   Provide clear guidelines for resolving common verification issues.

---

## 2. Administrator Procedures

**Role**: Superuser control over vendors, students, and system settings.

### 2.1. Monthly Student Enrollment (Bulk Upload)

**Frequency**: Once per month (usually 2-3 days before the 1st of the new month).
**Prerequisite**: A clean `.xlsx` (Excel) file containing student choices.

#### Data Requirements
Your Excel file **MUST** contain the following headers exactly as written (case-sensitive):

| Header | Description | Example |
| :--- | :--- | :--- |
| `Email Address` | Student's official email. | `john.doe@sst.edu.in` |
| `Choose your preference` | **Exact name** of the vendor selected. | `Spice Kitchen` |
| `Meal Option` | Dietary preference. | `Vegetarian`, `Non-Vegetarian`, `Eggetarian` |
| `Hostel` | Assigned campus/hostel. | `Velankani Micro Campus (Uniworld 2)` |
| `Batch` | Student's batch identifier. | `2027` |
| `Name` | (New Users Only) Student's full name. | `John Doe` |

> **! IMPORTANT**
> The `Choose your preference` value must **exactly match** the Vendor Name stored in the system (e.g., if system has "Spice Kitchen", "spice kitchen" or "Spice Kitchen Pvt Ltd" might fail).

#### Workflow steps:
1.  Navigate to the **Admin Dashboard** > **Upload Vendor Selection**.
2.  Select the **Target Month** for these records (e.g., "August 2026").
3.  Click **Choose File** and select your prepared `.xlsx` sheet.
4.  Click **Upload**.
5.  **Review the Output Log**:
    *   **New Entries**: Number of successful enrollments.
    *   **Duplicates**: Students who were already enrolled (skipped).
    *   **Issues**: Rows that failed (e.g., "Vendor not found"). **Fix these rows in the Excel file and re-upload ONLY the failed rows.**

---

### 2.2. Vendor Management

#### Adding a New Vendor
1.  Go to **Admin Dashboard** > **Add Vendor**.
2.  Fill in the Form:
    *   **Name**: Display name (e.g., "North Indian Mess").
    *   **Description**: Short snippet (e.g., "Authentic Punjabi Cuisine").
    *   **Price**: Price per meal/subscription (numeric value).
    *   **Menu URL**: (Optional) External link.
    *   **Meal Options**: Check all that apply (Breakfast/Lunch/Dinner).
3.  **Menu File**: Upload a `.csv` file to auto-populate the weekly menu (see section 2.3).
4.  Click **Add Vendor**.

#### Updating an Existing Vendor
1.  Go to **Vendor Management** list.
2.  Click **Edit** (Pencil Icon) next to the vendor.
3.  Update fields as necessary.
4.  **Save Changes**.

---

### 2.3. Menu Management

**Format**: Menus are uploaded via CSV or managed in the database.
**Structure**: A menu CSV typically maps days of the week to items.

#### Updating Weekly Menu
1.  Navigate to **Update Menu**.
2.  Select the **Vendor**.
3.  Input the new items for each day (Breakfast, Lunch, Dinner).
4.  Click **Save**. *Changes reflect immediately for students.*

---

### 2.4. System Controls

#### Feedback Form Toggle
**Purpose**: Open/Close the feedback window (e.g., open only for the last week of the month).
1.  Go to **Admin Controls**.
2.  Locate **Feedback Form Availability**.
3.  Toggle the switch **ON** to allow submissions, **OFF** to stop them.

---

### 2.5. Manual QR Verification
**Use Case**: Student's phone implies "Active", but Vendor scanner is broken or internet is down.
1.  Go to **Admin Dashboard** > **Verify Student QR**.
2.  Enter the Student's **Email** or **Roll Number**.
3.  Select the **Meal** (Breakfast/Lunch/Dinner).
4.  Click **Verify & Record**. *This manually logs the meal as "Consumed".*

---

## 3. Vendor Procedures

**Role**: Validate eligibility and serve food.

### 3.1. Validating a Meal (Scanning)
1.  Log in to the **Vendor Portal**.
2.  Access the **QR Scanner** (Verify Student QR page).
3.  **Permission**: Allow camera access if prompted.
4.  **Scan**: Point camera at Student's generated QR code.
    *   **Green Checkmark**: "Verified Successfully" -> **SERVE FOOD**.
    *   **Red X**: "Already Scanned" or "Invalid Vendor" -> **DENY FOOD**.

### 3.2. Common Scanning Errors
| Error Message | Meaning | Action |
| :--- | :--- | :--- |
| `Token Expired` | QR is >15 mins old. | Ask student to refresh/regenerate QR. |
| `Wrong Vendor` | Student selected a different mess. | Direct student to their assigned mess. |
| `Already Scanned` | User already ate this meal today. | Do **NOT** serve. |
| `403 Forbidden` | You are logged in as a Student. | Log out and login with Vendor credentials. |

---

## 4. Student Procedures

### 4.1. Accessing Meals
1.  **Login**: Use your institutional email.
2.  **Dashboard**: Check your "Current Mess" assignment.
3.  **Get Food**:
    *   Click the **Get Food** button.
    *   Select the current meal (e.g., Lunch).
    *   **Wait** for the QR code to generate.
4.  **Scan**: Show the QR code to the Vendor immediately.
    *   *Note: Code expires in 15 minutes.*

### 4.2. Submitting Feedback
1.  Go to **Feedback** page.
2.  **Rate**: Hygiene, Taste, Variety, Staff, etc. (1-5 Stars).
3.  **Comment**: Add specific textual feedback.
4.  **Submit**.
    *   *Note: You can only submit if Admin has enabled the feedback window.*

---

## 5. Troubleshooting & FAQ

### 5.1. Connectivity Issues
**Scenario**: No internet at the mess counter.
**Solution**:
*   **Students**: Generate the QR code *before* entering the mess hall (while on Wi-Fi). The QR image is static once loaded and can be scanned offline by the vendor if the vendor has internet.
*   **Vendors**: Must have an active connection to validate the token against the server.

### 5.2. "Mess Not Opted" Error
**Scenario**: Student logs in but sees "You have not opted for a mess".
**Cause**: Admin has not uploaded their selection for this month, or email mismatch in the Excel sheet.
**Resolution**: Contact Admin with your official email id to verify the `vendor_selections` table.

### 5.3. Wrong Meal Time
**Scenario**: Cannot generate QR.
**Logic**:
*   Breakfast: 07:00 - 10:00
*   Lunch: 12:00 - 15:00
*   Dinner: 19:00 - 22:00
*   *Attempting to generate outside these windows will fail.*

---

## 6. Support Escalation

1.  **Level 1 (User Mistake)**: Retry action, check internet, refresh page.
2.  **Level 2 (Data Error)**: "Wrong Vendor" / "Not Opted". **Contact Admin** to check database entries.
3.  **Level 3 (System Failure)**: 500 Server Errors, White Screen. **Contact Developer Team**.
