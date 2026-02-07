# SST Mess Management System - User Documentation

## 1. Project Overview
The **SST Mess Management System** is a comprehensive digital platform designed to streamline the meal management process for the SST educational institution. It replaces manual tracking with a seamless, role-based digital workflow.

**Purpose**: To digitize the interaction between students, mess vendors, and administrators, ensuring accurate meal tracking, feedback collection, and efficient vendor management.
**Users**:
*   **Students**: To view menus, select vendors, and access their daily meals via QR codes.
*   **Vendors**: To verify student eligibility and view service analytics.
*   **Admins**: To oversee the entire operation, manage vendors, and analyze data.
**Problem Solved**: Eliminates paper coupons/tokens, reduces queue times, ensures students only eat where they are successfully enrolled, and provides actionable feedback data for quality improvement.

## 2. What Users Can Do

### Student
*   **View Dashboard**: See current stats and active actions.
*   **Generate Meal QR**: Create a time-sensitive QR code to claim breakfast, lunch, or dinner.
*   **View Menus**: Check the weekly menu for their selected vendor.
*   **Submit Feedback**: Rate vendors on hygiene, quantity, timeliness, variety, and staff behavior.
*   **View Vendor Details**: Access information about all available vendors.

### Vendor
*   **Verify Student QR**: Scan student QR codes to validate meal eligibility.


### Admin
*   **Vendor Management**: Add new vendors, update existing details, and manage weekly menus.
*   **User Management**: Upload and manage bulk student vendor selections via Excel sheets.
*   **System Controls**: Toggle global features like the "Feedback Form" availability.
*   **Analytics**: View comprehensive charts on vendor popularity and student feedback trends.
*   **Manual Verification**: Verify a student's QR code manually if the vendor app faces issues.

## 3. Workflow / Lifecycle

### Student Meal Cycle
1.  **Vendor Selection**: At the start of the month, students are assigned a vendor (processed by Admin via `Vendor Selection Upload`).
2.  **Daily Meal Access**:
    *   **Status: Ready**: Student logs in during meal hours (Breakfast/Lunch/Dinner).
    *   **Action**: Click "Get Food" to generate a QR code.
    *   **Status: Active**: QR code is displayed (valid for 15 minutes).
    *   **Action**: Show QR to Vendor.
    *   **Status: Scanned**: Vendor scans the code. The meal is recorded.
    *   **Transition**: The QR code becomes invalid immediately after scanning.

### Feedback Cycle
1.  **Submission**: Students submit feedback forms for their current vendor.
2.  **Review**: Admins and Vendors view aggregated feedback data in the "Analysis" dashboard.

## 4. Scope & Access Control
Access is strictly managed via role-based usage of the **Clerk Validation** middleware.

*   **Role Validation**:
    *   **Students** cannot access Admin or Vendor pages.
    *   **Vendors** are restricted to the Vendor Dashboard and QR Verification tools.
    *   **Admins** have global access to all management features.
*   **Data Scope**:
    *   Students can only generate QR codes for *their* selected vendor.
    *   Vendors can only verify QR codes for meals *they* are authorized to serve.
*   **Access Denied**: Users attempting to access unauthorized routes are redirected or shown a "403 Forbidden" or "Unauthorized" message.

## 5. Notifications
The system primarily uses **In-App Notifications** to communicate status:
*   **Success Messages**: Toasts confirm actions like "QR Generated Successfully" or "Vendor Added".
*   **Error Alerts**: Distinct messages appear for issues like "You have already scanned for this meal" or "Vendor does not offer this meal".

*Note: Automated email notifications are not currently configured in the system logic.*

## 6. Best Practices for Users
*   **Generate QR at the Counter**: Since QR codes expire in 15 minutes, generate them only when you are near the counter to avoid expiration.
*   **Check Menu First**: Use the Vendor Details page to check the menu before heading to the mess.
*   **Submit Honest Feedback**: Regular feedback helps Admins ensure vendor quality.
*   **Vendor Selection**: Ensure your monthly vendor preference is correctly registered with the Admin if you are not seeing the correct vendor linked to your account.

## 7. Escalation Rules
*   **System Issues**: If the QR code fails to generate despite valid eligibility, students should contact the Admin immediately.
*   **Manual Verification**: In cases where the scanner fails, Admins have a specific "Verify Student QR" tool to manually override and record the meal.

## 8. Edge Cases & Important Rules
*   **One Meal Per Cycle**: A student can strictly scan **only once** per meal type (Breakfast, Lunch, Dinner) per day. Duplicate scans are blocked by the database.
*   **Correct Meal Window**: QR codes can only be generated during the specific time windows configured for each meal.
*   **Mess Not Opted**: If a student has not selected a vendor for the current month, they will receive a "Mess not opted in for this month" error and cannot generate QRs.
*   **Vendor Availability**: If a student's selected vendor does not serve a specific meal (e.g., Dinner), the student cannot generate a QR code for that meal.
*   **Token Expiry**: QR codes are valid for **15 minutes**. If it expires, the student must generate a new one (provided they haven't scanned yet, though the current logic implies a refresh might be needed).

## 9. FAQ

**Q: Can I eat at a different mess than the one I selected?**
**A:** No. The system locks your QR code generation to your selected vendor for the month. You cannot generate a valid code for another vendor.

**Q: What if my internet isn't working at the counter?**
**A:** You should load the app and generate the QR code while you have a connection. Once the QR image is loaded, it can be scanned, but ensuring a live connection is best for validation.

**Q: I scanned my code but didn't take food. Can I scan again?**
**A:** No. Once a code is scanned, the system marks that meal as "Consumed" for the day. You cannot generate another code for the same meal.

**Q: How do I change my vendor?**
**A:** Vendor changes are handled on a monthly basis. Please contact the Admin to update your `Vendor Selection` preference for the upcoming month.

**Q: Why do I see "Wrong meal time"?**
**A:** You are attempting to generate a QR code outside the designated serving hours for Breakfast, Lunch, or Dinner.

## 10. Key Takeaways
*   **Role-Based Efficiency**: Dedicated portals for Students, Vendors, and Admins ensure everyone focuses on their specific tasks.
*   **Strict Validation**: The system prevents meal duplication and unauthorized access through robust logic (One scan per meal, Vendor-Student matching).
*   **Data-Driven**: Feedback and choice analysis empower administrators to make informed decisions about vendor contracts.
*   **Digital First**: The entire workflow from menu viewing to meal consumption is paperless and tracked in real-time.
