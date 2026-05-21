import { redirect } from "next/navigation";

const TWEET_ID_RE = /^\d{1,20}$/;

interface Params {
  params: { id: string };
}

/** Handles X's short tweet URL shape `x.com/i/status/<id>` (deep links). */
export default function IStatusCatchAll({ params }: Params) {
  if (!TWEET_ID_RE.test(params.id)) {
    redirect("/");
  }
  const tweetUrl = `https://x.com/i/status/${params.id}`;
  redirect(`/?tweet=${encodeURIComponent(tweetUrl)}#analyze`);
}
