import { redirect } from "next/navigation";

// QR generation now lives on the student dashboard. Keep this route alive as
// a server-side redirect so existing bookmarks/links don't break.
export default function GetFoodPage() {
  redirect("/student/dashboard");
}
