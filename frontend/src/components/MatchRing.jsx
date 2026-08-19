const LEVEL_COLOR = {
  strong: "#2fd98a",
  possible: "#f0a83b",
  weak: "#ef5a5a",
};

function levelFromScore(score) {
  if (score >= 85) return "strong";
  if (score >= 65) return "possible";
  return "weak";
}

export default function MatchRing({ score = 0, level, size = 44, strokeWidth = 4 }) {
  const resolvedLevel = level || levelFromScore(score);
  const color = LEVEL_COLOR[resolvedLevel] || "#5b6570";

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${clampedScore} percent, ${resolvedLevel} match`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262d3a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>

      <span className="absolute font-mono text-[12px] font-bold text-text">
        {clampedScore}
      </span>
    </div>
  );
}
