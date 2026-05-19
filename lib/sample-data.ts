import type { AnalysisResult } from "./types";

export const SAMPLE_DRAFT = `🚨 YouTube content creators, take note! This tool is officially a game-changer:

It downloads a video → cleanly separates the audio → transcribes it to text → translates it into 100+ languages → clones the original voice and redubs the video.

And all that in **under 2 minutes**, 100% local and completely free.

Language barriers and production costs in content creation are now a thing of the past.`;

export const SAMPLE_RESULT: AnalysisResult = {
  draft_text: SAMPLE_DRAFT,
  leaks: [
    {
      phrase: "This tool is officially a game-changer:",
      short_label: "Vague hook",
      signal: "Click",
      severity: "Weak",
      why_it_leaks:
        "\"Game-changer\" is generic hype — it promises nothing specific, so readers don't know what payoff to expect.",
      ranker_assumes:
        "Reads as low-information bait — click intent is suppressed because the value proposition is undefined.",
      fix_strategy:
        "Replace the generic hype with a specific, high-value promise: what does it actually do, for whom, in what time.",
      suggested_rewrite:
        "How to redub any YouTube video into 100+ languages in <2 minutes (for free):",
      impact_lift: 14,
    },
    {
      phrase:
        "It downloads a video → cleanly separates the audio → transcribes it to text → translates it into 100+ languages → clones the original voice and redubs the video.",
      short_label: "Format leak",
      signal: "Dwell",
      severity: "Weak",
      why_it_leaks:
        "A long arrow-chain reads as a single wall of text — eyes slide past instead of stopping on each step.",
      ranker_assumes:
        "Short dwell time — readers don't pause long enough on the body for it to count as attention.",
      fix_strategy:
        "Break the chain into a vertical bulleted list. Each line earns its own pause and the post becomes scannable.",
      suggested_rewrite:
        "• Auto-download & audio separation\n• AI transcription & translation\n• Voice cloning & seamless redubbing",
      impact_lift: 10,
    },
    {
      phrase:
        "Language barriers and production costs in content creation are now a thing of the past.",
      short_label: "No question",
      signal: "Reply",
      severity: "Weak",
      why_it_leaks:
        "Closes with a declarative summary, not a prompt — there's nothing to respond to.",
      ranker_assumes:
        "No reply trigger — readers will scroll past instead of engaging.",
      fix_strategy:
        "End with a specific, low-friction question that asks the reader to commit to something concrete.",
      suggested_rewrite: "Which language should I test this on next? 👇",
      impact_lift: 12,
    },
  ],
  verdict: {
    band: "Moderate",
    reason:
      "Solid premise and a real product, but leaks on click (vague hook), dwell (wall-of-arrows body), and reply (declarative close) — three of the signals the open-source ranker explicitly tries to predict.",
  },
  positive_signals: [
    {
      name: "Like",
      grade: "Moderate",
      reason: "\"Game-changer\" framing + free/local promise reads as like-bait, but generic enthusiasm caps it.",
      trigger: "This tool is officially a game-changer:",
    },
    {
      name: "Reply",
      grade: "Weak",
      reason: "Closes with a declarative summary, not a question or take — readers have nothing to reply to.",
      trigger:
        "Language barriers and production costs in content creation are now a thing of the past.",
      fix_label: "no question",
    },
    {
      name: "Repost",
      grade: "Moderate",
      reason: "Tool announcements with concrete capabilities are repostable, but the hook is too generic to drive it.",
      trigger: "translates it into 100+ languages",
    },
    {
      name: "Quote",
      grade: "Moderate",
      reason: "Specific feature list invites someone to quote with their own take, but no quotable one-liner.",
      trigger: "100% local and completely free",
    },
    {
      name: "Click",
      grade: "Weak",
      reason: "\"Game-changer\" is empty hype — no specific promise tells the reader what they're about to learn or get.",
      trigger: "This tool is officially a game-changer:",
      fix_label: "vague hook",
    },
    {
      name: "Profile click",
      grade: "Weak",
      reason: "No distinctive POV — reads like a press release, not a person worth following.",
      trigger: "YouTube content creators, take note!",
      fix_label: "no POV",
    },
    {
      name: "Photo expand",
      grade: "Moderate",
      reason: "Demo image likely attached — photo_expand is a positive signal in the repo.",
      trigger: "",
    },
    {
      name: "Video view",
      grade: "Moderate",
      reason: "Tool demos work well as native video — would lift this signal if attached.",
      trigger: "",
    },
    {
      name: "Dwell",
      grade: "Weak",
      reason:
        "The arrow-chain body (\"downloads → separates → transcribes → translates → clones\") collapses into one visual wall — readers skim instead of stopping.",
      trigger:
        "It downloads a video → cleanly separates the audio → transcribes it to text → translates it into 100+ languages → clones the original voice and redubs the video.",
      fix_label: "format leak",
    },
    {
      name: "Follow",
      grade: "Weak",
      reason: "Announcement framing without personal angle — no reason to follow for more.",
      trigger: "",
    },
  ],
  negative_signals: [
    {
      name: "Not interested",
      risk: "Low",
      reason: "Useful tool announcement — not pattern-matching to a tired genre.",
      trigger: "",
    },
    {
      name: "Block",
      risk: "Low",
      reason: "Nothing abrasive.",
      trigger: "",
    },
    {
      name: "Mute",
      risk: "Low",
      reason: "No spam pattern.",
      trigger: "",
    },
    {
      name: "Report",
      risk: "Low",
      reason: "No policy red flags.",
      trigger: "",
    },
  ],
  structural: [
    {
      name: "Media",
      note: "Tool announcements convert best with a 10-30s demo video — register as both photo_expand and video_view.",
    },
    {
      name: "Author diversity",
      note: "Cannot judge without recent posting cadence. If posted minutes ago, the next post is downweighted.",
    },
    {
      name: "Safety pipeline",
      note: "Nothing visible that would be gated by Grox.",
    },
  ],
  rewrites: [
    {
      angle: "Combined",
      is_primary: true,
      addresses_signals: ["Click", "Dwell", "Reply", "Repost"],
      text: "🚨 How to redub any YouTube video into 100+ languages in <2 minutes (for free):\n\n• Auto-download & audio separation\n• AI transcription & translation\n• Voice cloning & seamless redubbing\n\nAnd all that in **under 2 minutes**, 100% local and completely free.\n\nWhich language should I test this on next? 👇",
      why_better:
        "Hook now promises a specific outcome (click), body becomes a scannable vertical list (dwell), and close invites a one-tap reply (reply) — three weak signals lifted in one pass.",
      predicted_lift: 24,
      highlights: [
        { phrase: "How to redub any YouTube video into 100+ languages in <2 minutes (for free):", label: "click hook" },
        { phrase: "Auto-download & audio separation", label: "concrete" },
        { phrase: "Which language should I test this on next? 👇", label: "reply trigger" },
      ],
      edits: [
        {
          original_phrase: "This tool is officially a game-changer:",
          new_phrase: "How to redub any YouTube video into 100+ languages in <2 minutes (for free):",
          signal: "Click",
          improvement_label: "Hook rewritten",
          description: "Replaces generic hype with a specific, high-value promise.",
        },
        {
          original_phrase:
            "It downloads a video → cleanly separates the audio → transcribes it to text → translates it into 100+ languages → clones the original voice and redubs the video.",
          new_phrase:
            "• Auto-download & audio separation\n• AI transcription & translation\n• Voice cloning & seamless redubbing",
          signal: "Dwell",
          improvement_label: "Format improved",
          description: "Vertical list increases readability and stop-rate.",
        },
        {
          original_phrase:
            "Language barriers and production costs in content creation are now a thing of the past.",
          new_phrase: "Which language should I test this on next? 👇",
          signal: "Reply",
          improvement_label: "Reply trigger added",
          description: "Invites user participation to boost ranker visibility.",
        },
      ],
    },
    {
      angle: "Reply-hook",
      text: "🚨 New OSS tool redubs any YouTube video into 100+ languages in <2 minutes. Local, free, voice-cloned.\n\nHonest question: which language would actually unlock new viewers for your channel?",
      why_better:
        "\"Honest question\" framing invites the reply signal while softening the announcement-feel.",
      predicted_lift: 16,
      highlights: [
        { phrase: "redubs any YouTube video into 100+ languages in <2 minutes", label: "click hook" },
        { phrase: "Honest question:", label: "softens bait" },
        { phrase: "which language would actually unlock new viewers for your channel?", label: "reply trigger" },
      ],
    },
    {
      angle: "Click-hook",
      text: "I redubbed my last YouTube video into 12 languages — voice-cloned, lip-synced, fully local.\n\nCost: $0. Time: 90 seconds.\n\nHere's the exact stack ↓ 🧵",
      why_better:
        "Thread teaser invites the click signal (expand thread), and a thread stacks engagement across each post in the chain.",
      predicted_lift: 14,
      highlights: [
        { phrase: "redubbed my last YouTube video into 12 languages", label: "proof" },
        { phrase: "Cost: $0. Time: 90 seconds.", label: "contrast" },
        { phrase: "Here's the exact stack ↓ 🧵", label: "click hook" },
      ],
    },
  ],
};
