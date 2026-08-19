export default function AuthBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between p-10 sm:p-12 lg:p-14 overflow-hidden bg-surface border-r border-border">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, rgba(47, 217, 138, 0.22), transparent 45%), radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.12), transparent 50%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <img src="/twin-lockup.svg" alt="TWIN" className="h-10 max-w-[200px]" />
      </div>

      <div className="relative max-w-md">
        <p className="mb-3.5 text-accent text-[11px] font-extrabold tracking-[2px] uppercase font-mono">
          Product Sourcing Intelligence
        </p>
        <h1 className="font-display font-extrabold tracking-tight leading-[1.1] text-text text-[clamp(30px,3.4vw,44px)]">
          Find profitable products
          <br />
          <span className="text-accent">without the manual work.</span>
        </h1>
        <p className="mt-4.5 text-text-muted text-[14.5px] leading-[1.7]">
          Upload screenshots, get an AI-built product fingerprint, and let
          the matching engine find where else it&apos;s sold — with a confidence
          score on every result.
        </p>
      </div>

      <div className="relative">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-ring" />
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-accent-dim to-border mx-2 max-w-[60px]" />
          <div className="w-2 h-2 rounded-full bg-accent" />
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-accent-dim to-border mx-2 max-w-[60px]" />
          <div className="w-2 h-2 rounded-full bg-accent-dim" />
          <div className="flex-1 h-[1.5px] bg-border mx-2 max-w-[60px]" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>
        <p className="mt-3.5 text-text-faint text-[11.5px] font-mono">
          UPLOAD → FINGERPRINT → MATCH → SOURCE
        </p>
      </div>
    </div>
  );
}
