import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthBrandPanel from "./AuthBrandPanel";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard/new";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-bg animate-fade-in">
      <AuthBrandPanel />

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src="/twin-mark.svg" alt="" className="w-10 h-10" />
            <div>
              <span className="font-display font-extrabold tracking-[0.14em] text-lg text-text block">TWIN</span>
              <span className="text-[10.5px] text-text-faint tracking-[0.18em] uppercase font-mono">Sourcing Intel</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold mb-2 text-text">Welcome back</h2>
          <p className="text-text-muted text-[13.5px] mb-7">
            Log in to continue sourcing with <span className="text-accent font-semibold">TWIN</span>.
          </p>

          {error && (
            <div className="mb-4 px-3.5 py-3 rounded-lg bg-red-soft border border-[rgba(239,90,90,0.35)] text-[#ff8f8f] text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-[12.5px] font-bold text-text">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 px-3.5 border border-border rounded-lg bg-surface-2 text-text text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-text-faint"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-[12.5px] font-bold text-text">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 px-3.5 border border-border rounded-lg bg-surface-2 text-text text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-text-faint"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[46px] mt-2 border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm transition-all duration-200 ease-out hover:bg-accent-strong hover:shadow-[0_8px_24px_rgba(47,217,138,0.28)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-5.5 text-center text-sm text-text-muted">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-accent font-bold hover:underline transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
