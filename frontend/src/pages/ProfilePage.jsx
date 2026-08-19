import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UpgradeModal from "../components/UpgradeModal";
import { createCheckoutSession } from "../lib/api";

function initials(name, email) {
  const source = (name || email || "").trim();
  if (!source) return "?";

  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const {
    user,
    updateProfile,
    refreshProfile,
    isPremium,
    searchesRemaining,
    freeSearchLimit,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [name, setName] = useState(user?.name || "");
  const [marketplace, setMarketplace] = useState(user?.marketplace || "");
  const [saved, setSaved] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [upgradedNotice, setUpgradedNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      refreshProfile();
      setUpgradedNotice(true);
      searchParams.delete("upgraded");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshProfile]);

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      await updateProfile({ name: name.trim(), marketplace });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaved(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);

    try {
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setCheckoutError(err.message || "Checkout failed.");
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h3 className="font-display text-2xl font-bold mb-2 text-text">Profile</h3>
        <p className="text-text-muted text-[13.5px]">
          Manage your account, plan, and default sourcing preferences.
        </p>
      </div>

      {upgradedNotice && isPremium && (
        <div className="mb-5 px-4 py-3.5 rounded-lg bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] text-[#34d399] text-[13.5px] font-semibold animate-fade-in">
          🎉 Welcome to <strong>TWIN Pro</strong> — unlimited searches are now unlocked.
        </div>
      )}

      <div className="max-w-[480px] mb-6 p-5 pt-5.5 rounded-xl border border-border bg-surface shadow-inner-soft">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <span className="block mb-1 text-text-faint text-xs font-semibold uppercase tracking-[0.04em]">
              Current plan
            </span>
            <strong className="text-lg">{isPremium ? "TWIN Pro" : "Free"}</strong>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.04em] ${
              isPremium
                ? "bg-[rgba(52,211,153,0.12)] text-[#34d399]"
                : "bg-[rgba(251,146,60,0.12)] text-[#fb923c]"
            }`}
          >
            {isPremium ? "Premium" : "Free"}
          </span>
        </div>

        {!isPremium && (
          <>
            <p className="m-0 mb-3.5 text-text-muted text-[13.5px]">
              <span className="text-text font-semibold">{searchesRemaining}</span> of{" "}
              <span className="text-text font-semibold">{freeSearchLimit}</span> free searches remaining
            </p>
            {checkoutError && (
              <div className="mb-3 px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.1)] text-[#fca5a5] text-sm animate-fade-in">
                {checkoutError}
              </div>
            )}
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full h-11 border-none rounded-lg text-white font-bold text-sm cursor-pointer transition-all duration-200 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              }}
              onMouseEnter={(e) => {
                if (!checkoutLoading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 10px 28px rgba(99, 102, 241, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {checkoutLoading && (
                <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {checkoutLoading ? "Redirecting..." : "Upgrade to Pro — $29"}
            </button>
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="block w-full mt-2.5 p-2 border-none bg-none text-text-faint text-sm cursor-pointer transition-colors duration-150 hover:text-text-muted"
            >
              View plan details
            </button>
          </>
        )}

        {isPremium && (
          <p className="m-0 text-accent text-[13.5px] font-semibold">
            ✦ Unlimited searches · Lifetime access
          </p>
        )}
      </div>

      <div className="max-w-[480px]">
        <div className="flex items-center gap-4 mb-7">
          <div className="w-14 h-14 rounded-full bg-accent-soft border border-accent-border text-accent flex items-center justify-center text-lg font-extrabold flex-shrink-0">
            {initials(user?.name, user?.email)}
          </div>
          <div>
            <strong className="block text-base text-text">{user?.name || "Unnamed"}</strong>
            <span className="block mt-0.5 text-[12.5px] text-text-faint">{user?.email}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-[18px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-name" className="text-[12.5px] font-bold text-text">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 px-3.5 border border-border rounded-lg bg-surface-2 text-text text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-email" className="text-[12.5px] font-bold text-text">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={user?.email || ""}
              disabled
              className="h-11 px-3.5 border border-border rounded-lg bg-surface-2 text-text-faint text-sm outline-none cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-marketplace" className="text-[12.5px] font-bold text-text">
              Default Marketplace
            </label>
            <select
              id="profile-marketplace"
              value={marketplace}
              onChange={(event) => setMarketplace(event.target.value)}
              className="h-11 px-3.5 border border-border rounded-lg bg-surface-2 text-text text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">No default</option>
              <option value="USA">USA</option>
              <option value="Canada">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-[46px] px-[22px] border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm transition-all duration-200 ease-out hover:bg-accent-strong hover:shadow-[0_8px_24px_rgba(47,217,138,0.28)] hover:-translate-y-0.5"
          >
            Save Changes
          </button>

          {saved && (
            <p className="mt-3.5 text-accent text-[12.5px] font-semibold animate-fade-in">
              ✓ Saved successfully
            </p>
          )}
        </form>
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        searchCount={user?.search_count ?? 0}
        limit={freeSearchLimit}
      />
    </div>
  );
}
