# SST Mess Management System

## 📝 Overview

This project is a comprehensive Mess Management System designed for educational institutions, specifically tailored for SST. It facilitates a seamless and digital-first experience for managing student meals, vendor selections, and feedback. The system is built with distinct roles for Students, Admins, and Vendors, each with a dedicated portal to manage their specific tasks.

- **Students** can provide feedback, and generate a QR code to avail their daily meals, and see the daily menu.
- **Admins** have oversight of the entire system. They can add or update vendor details, manage vendor menus, view analytics on student choices and feedback, and manage the meal selection cycle.
- **Vendors** can verify student QR codes to confirm meal eligibility and view analytics related to their service.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI, Lucide React
- **Deployment**: Assumed to be on a platform like Vercel.

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- Node.js (v20 or later recommended)
- pnpm (as indicated by `pnpm-lock.yaml`)

```bash
npm install -g pnpm
```

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd SST-mess
   ```
3. Install the dependencies:
   ```bash
   pnpm install
   ```
4. Set up your environment variables. Create a `.env.local` file in the root of the project and add the necessary keys for Clerk, your PostgreSQL database (Neon), etc.
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   POSTGRES_URL=
   ```

### Running the Development Server

Once the installation is complete, you can run the development server:

```bash
pnpm run dev
```

This will start the application on `http://localhost:3000`.

## ✨ Features & Pages

The application is organized into three main user-facing portals.

### `/student`
- **Dashboard**: Main landing page for students.
- **Get Food**: Page to generate a unique QR code for the current meal (breakfast, lunch, or dinner).
- **Vendor Details**: View information about available vendors.
- **Feedback**: Submit feedback on vendor services.

### `/admin`
- **Dashboard**: Overview of system statistics and controls.
- **Add Vendor**: Form to add a new vendor to the system.
- **Update Vendor Menu**: Interface to update the weekly menu for a specific vendor.
- **Upload Vendor Selection**: Bulk upload vendor selections for students.
- **Choice Analysis**: Analytics on vendor popularity and student preferences.
- **Feedback Analysis**: View and analyze feedback submitted by students.
- **Verify Student QR**: A utility to manually verify a student's meal QR code.
- **Admin Controls**: Toggle system features, like the feedback form availability.

### `/vendorUser`
- **Dashboard**: Main landing page for vendors.
- **Verify Student QR**: The primary tool for vendors to scan and validate a student's meal QR code.
- **Choice Analysis**: View analytics on how many students have selected them.

## 🔌 API Endpoints

The backend is built with Next.js API Routes. Here are the primary endpoints:

- `POST /api/admin/upload-vendor-selection`: Allows an admin to upload a file of vendor selections.
- `GET/POST /api/controls/feedback-toggle`: Manages the global setting for enabling or disabling the feedback form.
- `POST /api/meal/generate-qr`: Generates a meal QR code for a student.
- `GET /api/meal/status`: Checks the current meal status for a student (instead of the web sockets).
- `POST /api/meal/verify-qr`: Used by vendors to verify a student's QR code.
- `GET /api/user/latest-vendor`: Fetches the most recently selected vendor for the logged-in user.
- `GET /api/user/me`: Retrieves details for the currently logged-in user.
- `POST /api/vendor/addVendor`: Adds a new vendor to the database.
- `GET /api/vendor/choice-analysis`: Fetches data for vendor choice analysis.
- `GET /api/vendor/feedback-analysis`: Fetches data for vendor feedback analysis.
- `GET /api/vendor/getVendors`: Retrieves a list of all vendors.
- `PUT /api/vendor/updateVendor/[id]`: Updates details for a specific vendor.
- `POST /api/vendor/vendorFeedbackForm`: Submits feedback for a vendor from a student.

## 🗄️ Database Schema

The database schema is defined using Drizzle ORM. Here is an overview of the main tables:

| Table             | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `users`           | Stores user information, including their role (student, admin, vendor).     |
| `vendors`         | Contains details about each food vendor, including name, price, and menu.   |
| `menus`           | Stores the weekly meal plan (breakfast, lunch, dinner) for each vendor.     |
| `meals`           | Records each meal transaction, linking a student to the vendor who served them. |
| `vendor_selections` | Stores the vendor choice made by each student for a specific month.         |
| `vendor_feedbacks`| Aggregates student feedback for each vendor on various criteria.            |
| `controls`        | A table for feature flags and system-wide settings.                         |

### Enums
- **`role`**: `admin`, `student`, `vendor`
- **`meal_type`**: `breakfast`, `lunch`, `dinner`
- **`preference`**: `Vegetarian`, `Non-Vegetarian`
- **`hostel`**: `Velankani Micro Campus (Uniworld 2)`, `Neeladri Micro Campus (Uniworld 1)`