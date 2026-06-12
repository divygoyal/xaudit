import { redirect } from "next/navigation";

// Dashboard belongs to the old product. The layout short-circuits any
// /dashboard/* path back to the homepage so old links don't 404 and
// non-logged-in users don't get bounced to /login.
export default function DashboardLayout() {
  redirect("/");
}
