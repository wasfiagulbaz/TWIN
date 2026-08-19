import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clearHistory, getHistory } from "../context/history";
import MatchRing from "../components/MatchRing";

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(getHistory(user?.email));
  }, [user?.email]);

  const handleClear = () => {
    clearHistory(user?.email);
    setEntries([]);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-start gap-5 mb-7 flex-wrap">
        <div>
          <h3 className="font-display text-2xl font-bold mb-2 text-text">Search History</h3>
          <p className="text-text-muted text-[13.5px]">
            Every product search you&apos;ve run, most recent first.
          </p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-lg border border-border bg-surface-2 text-text-muted text-[12.5px] font-bold transition-all duration-200 hover:border-red hover:text-red hover:bg-red-soft/30"
          >
            Clear History
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="py-[60px] px-5 text-center border border-dashed border-border rounded-xl text-text-faint animate-fade-in">
          <p className="text-text font-semibold mb-2">No searches yet</p>
          <p className="mb-0">Run a product analysis to see it show up here.</p>
          <Link
            to="/dashboard/new"
            className="inline-block mt-4.5 px-[18px] py-2.5 rounded-lg bg-accent text-[#04120b] no-underline font-bold text-sm transition-all duration-200 hover:bg-accent-strong hover:-translate-y-0.5"
          >
            Start a New Search
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-[18px] p-[18px] border border-border rounded-xl bg-surface shadow-[0_1px_0_rgba(255,255,255,0.02)_inset] transition-all duration-200 hover:border-[#3a4456] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              {entry.topScore !== null && entry.topScore !== undefined && (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <MatchRing score={entry.topScore} level={entry.topLevel} size={40} />
                  <span className="text-[10px] text-text-faint uppercase tracking-[0.4px]">Top match</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h4 className="text-[14.5px] font-semibold text-text mb-1.5 truncate">
                  {entry.productTitle}
                </h4>
                <div className="flex flex-wrap gap-2.5 text-xs text-text-faint font-mono">
                  <span className="whitespace-nowrap">{formatDate(entry.createdAt)}</span>
                  <span className="whitespace-nowrap">•</span>
                  <span className="whitespace-nowrap">
                    {entry.resultCount} result{entry.resultCount === 1 ? "" : "s"}
                  </span>
                  {entry.marketplace && (
                    <>
                      <span className="whitespace-nowrap">•</span>
                      <span className="whitespace-nowrap">{entry.marketplace}</span>
                    </>
                  )}
                  {entry.maxBuyPrice !== null && entry.maxBuyPrice !== undefined && (
                    <>
                      <span className="whitespace-nowrap">•</span>
                      <span className="whitespace-nowrap">Max ${entry.maxBuyPrice.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
