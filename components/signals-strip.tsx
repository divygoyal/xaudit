import {
  Heart,
  MessageCircle,
  Repeat2,
  Quote,
  MousePointerClick,
  UserRound,
  Image as ImageIcon,
  PlayCircle,
  Timer,
  UserPlus,
  EyeOff,
  Ban,
  VolumeX,
  Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const POSITIVE: { name: string; Icon: LucideIcon }[] = [
  { name: "Like", Icon: Heart },
  { name: "Reply", Icon: MessageCircle },
  { name: "Repost", Icon: Repeat2 },
  { name: "Quote", Icon: Quote },
  { name: "Click", Icon: MousePointerClick },
  { name: "Profile click", Icon: UserRound },
  { name: "Photo expand", Icon: ImageIcon },
  { name: "Video view", Icon: PlayCircle },
  { name: "Dwell", Icon: Timer },
  { name: "Follow", Icon: UserPlus },
];

const NEGATIVE: { name: string; Icon: LucideIcon }[] = [
  { name: "Not interested", Icon: EyeOff },
  { name: "Block", Icon: Ban },
  { name: "Mute", Icon: VolumeX },
  { name: "Report", Icon: Flag },
];

export function SignalsStrip() {
  return (
    <section id="signals" className="relative border-t border-ink-700/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <SectionEyebrow>The 13 signals</SectionEyebrow>
            <h2 className="mt-4 font-sans text-display-md font-medium text-paper">
              13 signals.<br />One <span className="serif-italic">verdict</span>.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-200">
              Every draft is scored against the engagement actions X&apos;s open-source ranker
              explicitly tries to predict. Ten the algorithm rewards. Four it punishes.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              <span className="h-px w-6 bg-ink-600" />
              Source: xai-org/x-algorithm
            </div>
          </div>

          <div className="space-y-10">
            {/* positives */}
            <div>
              <div className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-moss">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                Rewarded — 10
              </div>
              <div className="flex flex-wrap gap-2">
                {POSITIVE.map(({ name, Icon }) => (
                  <SignalChip key={name} name={name} Icon={Icon} tone="positive" />
                ))}
              </div>
            </div>

            {/* negatives */}
            <div>
              <div className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-rust">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                Punished — 4
              </div>
              <div className="flex flex-wrap gap-2">
                {NEGATIVE.map(({ name, Icon }) => (
                  <SignalChip key={name} name={name} Icon={Icon} tone="negative" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignalChip({
  name,
  Icon,
  tone,
}: {
  name: string;
  Icon: LucideIcon;
  tone: "positive" | "negative";
}) {
  const styles =
    tone === "positive"
      ? "border-ink-700 bg-ink-900/60 hover:border-moss/50 hover:bg-moss/5 text-paper"
      : "border-ink-700 bg-ink-900/40 hover:border-rust/50 hover:bg-rust/5 text-paper";
  const iconColor = tone === "positive" ? "text-moss" : "text-rust";
  return (
    <span
      className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition-all duration-200 ${styles}`}
    >
      <Icon size={13} className={iconColor} />
      {name}
    </span>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-vermillion-glow">
      {children}
    </div>
  );
}
