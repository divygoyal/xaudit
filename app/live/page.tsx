import { redirect } from "next/navigation";

// /live is now the homepage. Keep the route as a permanent redirect so
// any existing links (or the older iframe-style page) land on / without
// breaking.
export default function LiveRedirect() {
  redirect("/");
}
