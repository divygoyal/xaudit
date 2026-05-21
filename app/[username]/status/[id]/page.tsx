import { redirect } from "next/navigation";

// X tweet IDs are positive integers (snowflake format, ~18-20 digits).
// X usernames are 1-15 chars, alphanumeric + underscore.
const USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;
const TWEET_ID_RE = /^\d{1,20}$/;

interface Params {
  params: { username: string; id: string };
}

/**
 * URL-hack catch-all for the canonical X tweet permalink shape.
 *
 *   x.com/nmatares/status/2057114593290575914
 *   → user replaces `x.com` with our domain
 *   letxcook.com/nmatares/status/2057114593290575914
 *   → this route reconstructs the X URL and hands it to the analyzer
 *
 * Validation: refuse anything that doesn't *look* like a tweet permalink
 * (off-spec username or non-numeric id). Those land on home instead of
 * triggering a guaranteed-to-fail fetch.
 */
export default function TweetCatchAll({ params }: Params) {
  const { username, id } = params;
  if (!USERNAME_RE.test(username) || !TWEET_ID_RE.test(id)) {
    redirect("/");
  }
  const tweetUrl = `https://x.com/${username}/status/${id}`;
  redirect(`/?tweet=${encodeURIComponent(tweetUrl)}#analyze`);
}
