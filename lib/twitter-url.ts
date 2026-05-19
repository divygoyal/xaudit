export type TwitterUrlParts = {
  username: string;
  tweetId: string;
};

const URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.|mobile\.|m\.)?(?:x|twitter|nitter|fxtwitter|fixupx|vxtwitter|fixvx)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i;

export function parseTwitterUrl(input: string): TwitterUrlParts | null {
  if (!input) return null;
  const match = input.trim().match(URL_PATTERN);
  if (!match) return null;
  return { username: match[1], tweetId: match[2] };
}
