import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type SocialMetricsVideoProps = {
  title: string;
  keyword: string;
  views: number;
  likes: number;
  comments: number;
  periodLabel: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const MetricCard: React.FC<{
  label: string;
  value: number;
  accent: string;
  delay: number;
}> = ({ label, value, accent, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 18,
      stiffness: 95,
    },
  });

  return (
    <div
      className="metric-card"
      style={{
        borderColor: accent,
        transform: `translateY(${interpolate(progress, [0, 1], [44, 0])}px)`,
        opacity: progress,
      }}
    >
      <div className="metric-label">{label}</div>
      <div className="metric-value">{formatCompact(value)}</div>
      <div className="metric-detail">{numberFormatter.format(value)} total</div>
    </div>
  );
};

export const SocialMetricsVideo: React.FC<SocialMetricsVideoProps> = ({
  title,
  keyword,
  views,
  likes,
  comments,
  periodLabel,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });
  const outroOpacity = interpolate(
    frame,
    [durationInFrames - 40, durationInFrames - 1],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const progressWidth = interpolate(frame, [0, durationInFrames - 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="video-shell">
      <div className="background-grid" />
      <main
        className="content"
        style={{
          opacity: outroOpacity,
          transform: `scale(${interpolate(intro, [0, 1], [0.96, 1])})`,
        }}
      >
        <section className="headline">
          <p className="eyebrow">{periodLabel}</p>
          <h1>{title}</h1>
          <div className="keyword-row">
            <span>Keyword</span>
            <strong>{keyword}</strong>
          </div>
        </section>

        <section className="metrics">
          <MetricCard label="Views" value={views} accent="#22c55e" delay={18} />
          <MetricCard label="Likes" value={likes} accent="#38bdf8" delay={30} />
          <MetricCard
            label="Comments"
            value={comments}
            accent="#f97316"
            delay={42}
          />
        </section>

        <footer>
          <span>Ready for collected data input</span>
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </footer>
      </main>
    </AbsoluteFill>
  );
};
