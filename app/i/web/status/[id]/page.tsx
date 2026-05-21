import { redirect } from "next/navigation";

const TWEET_ID_RE = /^\d{1,20}$/;

interface Params {
  params: { id: string };
}

/** Handles X's alternate tweet URL shape — `x.com/i/web/status/<id>` —
 *  which is what shows up when a tweet is opened from a non-logged-in
 *  session or shared via certain clients. We don't have the username
 *  in this shape but fxtwitter resolves by ID alone.
 */
export default function IWebStatusCatchAll({ params }: Params) {
  if (!TWEET_ID_RE.test(params.id)) {
    redirect("/");
  }
  const tweetUrl = `https://x.com/i/web/status/${params.id}`;
  redirect(`/?tweet=${encodeURIComponent(tweetUrl)}#analyze`);
}
