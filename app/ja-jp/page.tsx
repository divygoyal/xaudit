import { redirect } from "next/navigation";

// Old marketing locale page. Redirect to the homepage; if a Japanese
// locale of the live board is needed later, build it back as a proper
// next-intl route group rather than restoring this file.
export default function JaJpRedirect() {
  redirect("/");
}
