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
**Prerequisite**: A list of student emails — pasted, or a `.csv`/`.xlsx` file.

#### Data Requirements

**The sheet contains student emails only.** No headers are required, and every other column is
ignored. Vendor, month and meal preference are chosen in the form, not read from the file — so
there is no vendor-name spelling to get wrong any more.

You can also skip the file entirely and paste emails straight into the form, separated by spaces,
commas or new lines.

> **! IMPORTANT — one upload per meal preference**
> The **Meal preference** you pick applies to *every* student in that upload. So split the month's
> list by preference and upload each batch separately: the vegetarian list with `Vegetarian`
> selected, then the non-vegetarian list with `Non-Vegetarian`, and so on. Uploading a mixed list
> records everyone as whichever preference is selected.

#### Workflow steps:
1.  Navigate to the **Admin Dashboard** > **Manage Students** > **Bulk Upload**.
2.  Choose the **Vendor**, the **Month**, and the **Meal preference** for this batch.
3.  Either **Paste** the emails, or switch to **File** and choose your `.csv`/`.xlsx`.
4.  Click **Verify** — nothing is written yet.
5.  **Review the four tabs** before confirming:
    *   **To add** — students with no selection this month. These will be created.
    *   **Already opted** — students who already have a selection. Tick the ones you want *moved* to
        this vendor; untouched ones keep what they have.
    *   **Not found** — no student account for that email. Fix the address, or have the account added.
    *   **Invalid** — not a valid email address.
6.  Click **Confirm** to save. The whole batch is written in one transaction — if anything fails,
    nothing is saved and you can safely retry.

---

### 2.2. Vendor Management

#### Adding a New Vendor
1.  Go to **Admin Dashboard** > **Add Vendor**.
2.  Fill in the Form:
    *   **Name**: Display name (e.g., "North Indian Mess").
    *   **Description**: Short snippet (e.g., "Authentic Punjabi Cuisine").
    *   **Price**: Price per meal/subscription (numeric value).
    *   **Menu URL**: (Optional) External link.
    *   **Meal Options**: Check all that apply (Breakfast/Lunch/Dinner). These decide which meal boxes
        appear on the menu cards, so get them right before entering menus.
3.  Click **Add Vendor**, then set the menu day-by-day under **Update Menu** (see section 2.3).

#### Updating an Existing Vendor
1.  Go to **Vendor Management** list.
2.  Click **Edit** (Pencil Icon) next to the vendor.
3.  Update fields as necessary.
4.  **Save Changes**.

---

### 2.3. Menu Management

**No file uploads.** The menu is typed in, one day at a time, for a rolling **15-day window**: today
plus the next fourteen days.

#### Updating the menu
1.  Navigate to **Update Menu** and select the **Vendor**.
2.  You get one card per day, today first, each showing Breakfast / Lunch / Dinner. Use the **arrows**
    (or swipe) to move one day at a time.
3.  Click the **pencil** on the day you want to change — only that day becomes editable.
4.  Type the dishes, **one per line**, in each meal box.
5.  Click **Save**. *Changes reflect immediately for students.*

> **The window looks after itself.** Each day that passes drops off the front, and a fresh empty day
> appears at the far end ready to fill — so there are always 15. Nothing needs creating in advance.
> A day only becomes a saved record once you enter dishes for it.

**Only meals the vendor actually serves are shown.** If a vendor is lunch-only, that's the only box on
the card — controlled by the vendor's Breakfast/Lunch/Dinner options under Manage Vendors.

**Menu link (optional)**: a separate field on the same page for an external menu URL, which students
can download. It is independent of the day-by-day menu.

#### What students see
The same day cards, read-only, under **Menu** in their sidebar. They can browse **any** vendor's menu
via the pills at the top, with their own vendor marked *Yours* and selected first.

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
3.  **Permission**: Tap **Enable camera**, then choose **Allow** in the browser's own prompt that
    follows. Do not tap *Block* — see the warning in 3.3.
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

### 3.3. Camera Won't Start
The scanner never opens the camera on its own — it shows a **Turn on the camera to scan** card
first, and only asks the browser once you tap **Enable camera**. If anything goes wrong you land
back on that card with the reason printed on it, and the same button tries again.

> **Important:** the browser only re-shows its camera prompt if you *dismissed* it. Once you tap
> **Block**, the choice is saved for the site and **no website can ask again** — it has to be
> changed in browser settings (Android: lock icon → Permissions → Camera; iOS: `aA` → Website
> Settings → Camera; desktop: camera icon at the right of the address bar). This is exactly why
> the card explains the camera before the prompt appears.

| Message on the card | Meaning | Action |
| :--- | :--- | :--- |
| `Camera access was blocked` | Permission was refused. | Set Camera to *Allow* in browser settings (above), then tap **Enable camera**. |
| `No camera was found on this device` | No usable camera. | Connect/enable a camera, then tap **Enable camera**. |
| `The camera is already in use` | Another app or tab holds the camera. | Close it, then tap **Enable camera**. |
| `The camera needs a secure connection` | Page opened over `http`. | Open the `https` address of the site. |

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
