import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard/new", label: "New Search", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ), title: "New Search" },
  { to: "/dashboard/history", label: "History", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ), title: "Search History" },
  { to: "/dashboard/profile", label: "Profile", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ), title: "Profile" },
];

function initials(name, email) {
  const source = (name || email || "").trim();
  if (!source) return "?";

  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function DashboardLayout() {
  const { user, logout, isPremium, searchesRemaining, freeSearchLimit } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentTitle =
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.title ||
    "Dashboard";

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-2 mb-8">
        <img src="/twin-lockup.svg" alt="TWIN" className="h-9 flex-shrink-0 hidden lg:block max-w-[160px]" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ease-out ${
                isActive
                  ? "bg-accent-soft text-accent shadow-inner-soft"
                  : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`
            }
            title={item.title}
          >
            <span className="flex items-center justify-center w-5 flex-shrink-0">{item.icon}</span>
            <span className="lg:block hidden">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 mt-4 border-t border-border-soft">
        <div className="flex items-center gap-2.5 p-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-border text-text flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials(user?.name, user?.email)}
          </div>
          <div className="lg:block hidden min-w-0">
            <strong className="block text-xs text-text truncate">{user?.name || "Account"}</strong>
            <span className="block text-[11px] text-text-faint truncate">{user?.email}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { logout(); setMobileSidebarOpen(false); }}
          className="w-full mt-2.5 px-3 py-2.5 border border-border rounded-lg bg-transparent text-text-muted text-xs font-bold text-left hover:border-red hover:text-red transition-colors duration-200 lg:text-left text-center"
        >
          <span className="lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span className="lg:block hidden">Log out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] xl:w-[260px] flex-shrink-0 flex-col bg-surface border-r border-border p-6 sticky top-0 h-screen shadow-[2px_0_24px_rgba(0,0,0,0.3)]">
        <SidebarContent />
      </aside>

      {/* Collapsed tablet sidebar */}
      <aside className="hidden sm:flex lg:hidden w-[76px] flex-shrink-0 flex-col bg-surface border-r border-border px-2.5 py-5 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-surface border-r border-border p-5 sm:hidden transform transition-transform duration-300 ease-out ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 flex-shrink-0 border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 bg-bg-elevated/85 backdrop-blur-xl z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="sm:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="sm:hidden flex items-center gap-2">
              <img src="/twin-mark.svg" alt="" className="w-7 h-7" />
              <span className="font-display font-extrabold tracking-[0.12em] text-base text-text">TWIN</span>
            </div>
            <h2 className="text-sm font-bold text-text sm:block hidden">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {!isPremium && (
              <span className="px-3 py-1.5 rounded-full bg-[rgba(251,146,60,0.1)] border border-[rgba(251,146,60,0.2)] text-[#fb923c] text-[11px] font-bold font-mono whitespace-nowrap">
                {searchesRemaining} / {freeSearchLimit} left
              </span>
            )}
            {isPremium && (
              <span className="px-3 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent text-[11px] font-bold font-mono whitespace-nowrap">
                ✦ PRO
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 text-text-faint text-xs font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-ring" />
              <span className="hidden md:inline">System Ready</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-[5%] py-7 sm:py-10 max-w-[1100px] w-full mx-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
