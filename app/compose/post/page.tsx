import { redirect } from "next/navigation";

/** Catches `letxcook.com/compose/post` — the X composer URL.
 *  Drops the user straight into the analyzer with the textarea focused
 *  and the section scrolled into view. The `?compose=1` flag tells the
 *  AnalyzePanel to take focus on mount so the user lands ready to type. */
export default function ComposePostCatchAll() {
  redirect("/?compose=1#analyze");
}
