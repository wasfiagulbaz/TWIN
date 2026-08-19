import { useState } from "react";
import { createCheckoutSession } from "../lib/api";

const PRO_FEATURES = [
  "Unlimited product searches",
  "Full match scoring & retailer coverage",
  "Search history synced to your account",
  "Priority access to new features",
];

export default function UpgradeModal({ isOpen, onClose, searchCount, limit }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setError("");
    setIsLoading(true);

    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Checkout failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[rgba(8,10,18,0.72)] backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[440px] p-9 pt-8 pb-7 rounded-[20px] border border-[rgba(255,255,255,0.08)] animate-slide-up overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        style={{
          background:
            "linear-gradient(165deg, #1a1f2e 0%, #12151f 100%)",
          boxShadow:
            "0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, rgba(47,217,138,0.35) 0%, transparent 60%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 60%)" }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 border-none rounded-lg bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] text-lg leading-none flex items-center justify-center transition-all duration-150 hover:bg-[rgba(255,255,255,0.12)] hover:text-white"
        >
          ×
        </button>

        <div className="inline-block mb-4 px-3 py-1.5 rounded-full bg-[rgba(251,146,60,0.15)] text-[#fb923c] text-xs font-bold tracking-[0.04em] uppercase">
          Free limit reached
        </div>

        <h2 id="upgrade-title" className="m-0 mb-2.5 text-[#f8fafc] font-display text-2xl font-bold tracking-[-0.02em]">
          Upgrade to <span className="text-accent">TWIN</span> Pro
        </h2>
        <p className="m-0 mb-6 text-[rgba(248,250,252,0.65)] text-[15px] leading-[1.55]">
          You&apos;ve used <strong className="text-white">{searchCount}</strong> of{" "}
          <strong className="text-white">{limit}</strong> free searches. Go Pro for
          unlimited sourcing intelligence — permanently.
        </p>

        <div className="mb-6 p-5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-baseline gap-2">
            <span className="text-[#f8fafc] text-4xl font-extrabold tracking-[-0.03em]">$29</span>
            <span className="text-[rgba(248,250,252,0.5)] text-sm">one-time</span>
          </div>
          <p className="m-2 mt-0 text-[rgba(248,250,252,0.45)] text-sm">
            Lifetime access. No recurring fees.
          </p>
        </div>

        <ul className="m-0 mb-6 p-0 list-none">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 py-2 text-[rgba(248,250,252,0.85)] text-sm">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(52,211,153,0.15)] text-[#34d399] text-[11px] font-bold flex-shrink-0">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {error && (
          <div className="mb-4 px-3.5 py-3 rounded-lg bg-[rgba(239,68,68,0.12)] text-[#fca5a5] text-sm animate-fade-in">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full py-3.5 px-5 border-none rounded-xl text-white text-[15px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(99, 102, 241, 0.45)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.35)";
          }}
        >
          {isLoading && (
            <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {isLoading ? "Redirecting to checkout..." : "Upgrade to Pro →"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="block w-full mt-3 py-2.5 border-none bg-none text-[rgba(248,250,252,0.45)] text-sm cursor-pointer transition-colors duration-150 hover:text-[rgba(248,250,252,0.7)]"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
