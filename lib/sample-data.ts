import type { AnalysisResult } from "./types";

// ─────────────────────────────────────────────────────────────
// English sample — shown on the EN hero. The post archetype is a
// "🚨 take note!" announcement that pretends to be informative but
// is generic hype — perfect demo for showing the grader catch a
// vague hook, format leak, and missing reply trigger.
// ─────────────────────────────────────────────────────────────

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
      "Solid premise and a real product, but leaks on click (vague hook), dwell (wall-of-arrows body), and reply (declarative close) — three signals that shape how readers engage.",
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

// ─────────────────────────────────────────────────────────────
// Japanese sample — shown on the /ja-jp hero. The post archetype is
// a creator/indie-dev "アプリを作りました" announcement — relatable JP
// X-creator content, weak in exactly the right ways to demo the
// 13-signal grader (vague hook, missing pain point, generic benefit
// description, no reply trigger). Data extracted verbatim from a
// real gemini-3.5-pro analysis of this draft on a localized API
// (locale=ja-jp), so every short_label / why_it_leaks / edit
// description / rewrite text is natural Japanese, not a translation
// of an English template. See scripts/extract-sample.ts for how it
// was pulled from Supabase.
// ─────────────────────────────────────────────────────────────

export const SAMPLE_DRAFT_JA = "英語学習アプリを作りました。\n\nAIと会話しながら、\n単語や文法を練習できます。\n\nぜひ使ってみてください。";

export const SAMPLE_RESULT_JA: AnalysisResult = {
  "leaks": [
    {
      "phrase": "英語学習アプリを作りました。",
      "signal": "Click",
      "severity": "Weak",
      "impact_lift": 18,
      "short_label": "ターゲット訴求の不足",
      "fix_strategy": "ターゲット（例：緊張して英語が話せない人など）の具体的な悩みを冒頭に提示し、自分ごと化させます。",
      "why_it_leaks": "誰のためのアプリなのか、どんな悩みを解決できるのかが不明確なため、スクロールを止めて詳細を確認する動機が生まれません。",
      "ranker_assumes": "ユーザーがこの投稿を無視してスクロールしたため、コンテンツの魅力度が低いと判定します。",
      "suggested_rewrite": "「外国人を前にすると緊張して話せない…」という人のために、AI相手に緊張ゼロで話せる英語学習アプリを作りました。"
    },
    {
      "phrase": "AIと会話しながら、\n単語や文法を練習できます。",
      "signal": "Dwell",
      "severity": "Weak",
      "impact_lift": 15,
      "short_label": "平凡な機能説明",
      "fix_strategy": "アプリの具体的な動作や、ユーザーが得られる独自の体験（ベネフィット）を具体的に描写します。",
      "why_it_leaks": "競合アプリが無数にある中で、ありきたりな機能説明だけでは読者が足を止めて読み込む理由がありません。",
      "ranker_assumes": "読了時間が極めて短く、ユーザーがコンテンツに価値を感じていないと評価します。",
      "suggested_rewrite": "ChatGPTがあなたの文法ミスをその場で優しく修正。1回3分から、ゲーム感覚でリアルな日常会話が身につきます。"
    },
    {
      "phrase": "ぜひ使ってみてください。",
      "signal": "Reply",
      "severity": "Weak",
      "impact_lift": 12,
      "short_label": "弱いエンゲージメント誘導",
      "fix_strategy": "ユーザーに意見を求める質問を投げかけるか、開発の背景を語ることで、リプライ欄での会話を活性化させます。",
      "why_it_leaks": "一方的な告知で終わっており、ユーザーがリプライで反応したり意見を述べたりする余地がありません。",
      "ranker_assumes": "コミュニティとの双方向の対話が発生しない、一方通行の宣伝アカウントであるとみなします。",
      "suggested_rewrite": "完全無料で公開中。どんな機能が欲しいか、ぜひリプ欄で教えてください！👇"
    }
  ],
  "verdict": {
    "band": "Weak",
    "reason": "全体的に宣伝感が強く、ユーザーがクリック、リプライ、または詳細を読む（Dwell）ためのフックが著しく不足しています。"
  },
  "rewrites": [
    {
      "text": "「外国人を前にすると緊張して話せない…」という人のために、AI相手に緊張ゼロで英会話を練習できるアプリを作りました。\n\nChatGPTがあなたの文法ミスをその場で優しく修正。1回3分から、ゲーム感覚でリアルな日常会話が身につきます。\n\n完全無料で公開中。どんな機能が欲しいか、ぜひリプ欄で教えてください！👇",
      "angle": "Combined",
      "edits": [
        {
          "signal": "Click",
          "new_phrase": "「外国人を前にすると緊張して話せない…」という人のために、AI相手に緊張ゼロで英会話を練習できるアプリを作りました。",
          "description": "ターゲットの悩みを明確にし、自分ごと化させてクリックを促します。",
          "original_phrase": "英語学習アプリを作りました。",
          "improvement_label": "ターゲット訴求の追加"
        },
        {
          "signal": "Dwell",
          "new_phrase": "ChatGPTがあなたの文法ミスをその場で優しく修正。1回3分から、ゲーム感覚でリアルな日常会話が身につきます。",
          "description": "具体的な機能と利用体験を記述し、滞在時間を延ばします。",
          "original_phrase": "AIと会話しながら、\n単語や文法を練習できます。",
          "improvement_label": "ベネフィットの具体化"
        },
        {
          "signal": "Reply",
          "new_phrase": "完全無料で公開中。どんな機能が欲しいか、ぜひリプ欄で教えてください！👇",
          "description": "ユーザーが反応しやすい質問を投げかけ、返信を促します。",
          "original_phrase": "ぜひ使ってみてください。",
          "improvement_label": "リプライのトリガー追加"
        }
      ],
      "highlights": [
        {
          "label": "フック",
          "phrase": "「外国人を前にすると緊張して話せない…」"
        },
        {
          "label": "具体性",
          "phrase": "ChatGPTがあなたの文法ミスをその場で優しく修正。"
        },
        {
          "label": "リプライ誘導",
          "phrase": "ぜひリプ欄で教えてください！👇"
        }
      ],
      "is_primary": true,
      "why_better": "ターゲットの強い悩みに共感させてクリックを誘発し、具体的な機能とベネフィットを提示して滞在時間（Dwell）を延ばします。さらに、最後に具体的な質問を配置することでリプライ（Reply）を促進し、アルゴリズムが重視するエンゲージメントを網羅的に獲得します。",
      "predicted_lift": 28,
      "addresses_signals": [
        "Click",
        "Dwell",
        "Reply",
        "Like",
        "Follow"
      ]
    },
    {
      "text": "英語学習アプリを作りました！AI相手に緊張ゼロで英会話を練習できます。\n\n皆さんが「英語学習で一番挫折しやすいポイント」はどこですか？\n1. 単語が覚えられない\n2. 話す相手がいない\n3. モチベーションが続かない\n\nぜひリプ欄で教えてください。その悩みを解決する機能をアプリに実装します！",
      "angle": "Reply-hook",
      "highlights": [
        {
          "label": "リプライ誘導",
          "phrase": "皆さんが「英語学習で一番挫折しやすいポイント」はどこですか？"
        },
        {
          "label": "ベネフィット",
          "phrase": "その悩みを解決する機能をアプリに実装します！"
        }
      ],
      "is_primary": false,
      "why_better": "選択肢を用意した質問を投げかけることで、ユーザーがリプライしやすくなり、Replyシグナルを強力に引き出します。",
      "predicted_lift": 18,
      "addresses_signals": [
        "Reply"
      ]
    },
    {
      "text": "「英会話スクールは高すぎるし、緊張する…」\n\nそんな人のために、AI相手に24時間いつでも、緊張ゼロで英会話を練習できるアプリを作りました。\n\nChatGPT搭載で、あなたの文法ミスも瞬時にフィードバック。詳細とアプリのURLはこちらから。👇",
      "angle": "Click-hook",
      "highlights": [
        {
          "label": "フック",
          "phrase": "「英会話スクールは高すぎるし、緊張する…」"
        },
        {
          "label": "クリック誘導",
          "phrase": "詳細とアプリのURLはこちらから。👇"
        }
      ],
      "is_primary": false,
      "why_better": "既存の代替手段（英会話スクール）のデメリットを提示し、それに対する解決策としてアプリを紹介することで、詳細（URL）へのクリックを促します。",
      "predicted_lift": 16,
      "addresses_signals": [
        "Click"
      ]
    },
    {
      "text": "英語学習アプリを作りました。AIと会話しながら、単語や文法を効率的に練習できます。\n\n【このアプリでできる3つのこと】\n1. AIがリアルタイムで文法ミスを添削\n2. あなたのレベルに合わせた日常会話レッスン\n3. 1回3分から、スキマ時間にゲーム感覚で学習\n\nシャイな人でも、これなら毎日続けられます。",
      "angle": "Dwell-hook",
      "highlights": [
        {
          "label": "情報整理",
          "phrase": "【このアプリでできる3つのこと】"
        },
        {
          "label": "具体性",
          "phrase": "1. AIがリアルタイムで文法ミスを添削"
        }
      ],
      "is_primary": false,
      "why_better": "箇条書きを使って情報を整理し、アプリの具体的な価値をステップ形式で読ませることで、ポスト上での滞在時間（Dwell）を最大化します。",
      "predicted_lift": 15,
      "addresses_signals": [
        "Dwell"
      ]
    },
    {
      "text": "「独学で英語を話せるようになるアプリ」を個人開発しています。\n\nAIとの会話を通じて、単語や文法をゲーム感覚で学べるアプリを本日リリースしました。これからユーザーのフィードバックを元に、毎週アップデートしていきます。\n\n英語学習の新しい形を一緒に作りたい方は、ぜひフォローして開発ロードマップを見守ってください！",
      "angle": "Follow-hook",
      "highlights": [
        {
          "label": "ストーリー",
          "phrase": "「独学で英語を話せるようになるアプリ」を個人開発しています。"
        },
        {
          "label": "フォロー誘導",
          "phrase": "ぜひフォローして開発ロードマップを見守ってください！"
        }
      ],
      "is_primary": false,
      "why_better": "単なる製品の紹介ではなく、「個人開発のストーリー」や「今後のアップデート予定」を提示することで、アカウント自体のファンを増やし、フォローを促します。",
      "predicted_lift": 20,
      "addresses_signals": [
        "Follow",
        "Profile click"
      ]
    }
  ],
  "draft_text": "英語学習アプリを作りました。\n\nAIと会話しながら、\n単語や文法を練習できます。\n\nぜひ使ってみてください。",
  "structural": [
    {
      "name": "Author diversity",
      "note": "同じジャンルの投稿を連続して行うと、アルゴリズムによる露出制限を受ける可能性があるため、開発プロセスや学習ノウハウなど投稿の切り口を多様化させる必要があります。"
    },
    {
      "name": "Safety pipeline",
      "note": "「英語学習」「AI」といったワードは安全なコンテンツとして判定され、Groxによるフィルタリングのリスクは極めて低いです。"
    },
    {
      "name": "Media",
      "note": "アプリの実際の動作がわかるスクリーンショットや、15秒程度のデモ動画を添付することで、Photo expandやVideo view、Dwellシグナルを劇的に向上させることができます。"
    }
  ],
  "negative_signals": [
    {
      "name": "Not interested",
      "risk": "Moderate",
      "reason": "一般的な宣伝ツイートに見えるため、タイムライン上で「興味なし」に設定されるリスクがあります。",
      "trigger": "英語学習アプリを作りました。",
      "fix_label": "広告感がある"
    },
    {
      "name": "Block",
      "risk": "Low",
      "reason": "不快な表現や規約違反はないため、ブロックされるリスクは極めて低いです。",
      "trigger": "",
      "fix_label": ""
    },
    {
      "name": "Mute",
      "risk": "Low",
      "reason": "過度な連投やスパム行為ではないため、ミュートされるリスクは低いです。",
      "trigger": "",
      "fix_label": ""
    },
    {
      "name": "Report",
      "risk": "Low",
      "reason": "安全な学習アプリの告知であり、報告される要素はありません。",
      "trigger": "",
      "fix_label": ""
    }
  ],
  "positive_signals": [
    {
      "name": "Like",
      "grade": "Weak",
      "reason": "共感や驚きを与える要素がなく、単なる製品告知になっているため、ライクを押す動機がありません。",
      "trigger": "ぜひ使ってみてください。",
      "fix_label": "感情のフックなし"
    },
    {
      "name": "Reply",
      "grade": "Weak",
      "reason": "問いかけや議論を呼ぶ要素がなく、リプライを送るきっかけがありません。",
      "trigger": "ぜひ使ってみてください。",
      "fix_label": "問いかけなし"
    },
    {
      "name": "Repost",
      "grade": "Weak",
      "reason": "他人にシェアしたくなるような有益な情報や、強い意見が含まれていません。",
      "trigger": "英語学習アプリを作りました。",
      "fix_label": "拡散価値の不足"
    },
    {
      "name": "Quote",
      "grade": "Weak",
      "reason": "引用して自分の意見を乗せたくなるような、独自の視点やインサイトがありません。",
      "trigger": "AIと会話しながら、\n単語や文法を練習できます。",
      "fix_label": "独自視点なし"
    },
    {
      "name": "Click",
      "grade": "Weak",
      "reason": "好奇心をそそる情報（情報ギャップ）がなく、リンク先や詳細を確認したいと思わせません。",
      "trigger": "英語学習アプリを作りました。",
      "fix_label": "フックが弱い"
    },
    {
      "name": "Profile click",
      "grade": "Weak",
      "reason": "開発者の人柄や他の活動に興味を持たせる要素がなく、プロフィールへの遷移が期待できません。",
      "trigger": "英語学習アプリを作りました。",
      "fix_label": "開発者プロフ誘導なし"
    },
    {
      "name": "Photo expand",
      "grade": "Weak",
      "reason": "画像やスクリーンショットが添付されていないため、このシグナルは発生しません。",
      "trigger": "",
      "fix_label": ""
    },
    {
      "name": "Video view",
      "grade": "Weak",
      "reason": "動画が添付されていないため、このシグナルは発生しません。",
      "trigger": "",
      "fix_label": ""
    },
    {
      "name": "Dwell",
      "grade": "Weak",
      "reason": "投稿が非常に短く、かつ内容がシンプルすぎるため、数秒で読み飛ばされてしまいます。",
      "trigger": "AIと会話しながら、\n単語や文法を練習できます。",
      "fix_label": "滞在時間フックなし"
    },
    {
      "name": "Follow",
      "grade": "Weak",
      "reason": "このアカウントをフォローし続けることで、今後どのような有益な情報が得られるかが伝わりません。",
      "trigger": "ぜひ使ってみてください。",
      "fix_label": "フォロー価値不明"
    }
  ]
} as AnalysisResult;
