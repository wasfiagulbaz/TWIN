export default function StepRail({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center mb-8 px-2 py-5" role="tablist" aria-label="Sourcing steps">
      {steps.map((step, index) => {
        const state =
          index < currentStep
            ? "done"
            : index === currentStep
            ? "active"
            : "upcoming";

        const clickable = onStepClick && index <= currentStep;

        const dotBase =
          "w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 transition-all duration-200 ease-out";
        const labelBase =
          "text-sm font-semibold whitespace-nowrap transition-colors duration-200";

        const dotClass =
          state === "active"
            ? `${dotBase} border-2 border-accent text-accent bg-accent-soft shadow-[0_0_0_4px_rgba(47,217,138,0.12)]`
            : state === "done"
            ? `${dotBase} border-2 border-accent-dim text-[#04120b] bg-accent`
            : `${dotBase} border-2 border-border text-text-faint bg-surface-2`;

        const labelClass =
          state === "active"
            ? `${labelBase} text-text`
            : state === "done"
            ? `${labelBase} text-text-muted`
            : `${labelBase} text-text-faint`;

        return (
          <div className="flex items-center flex-1 last:flex-none" key={step.key}>
            <button
              type="button"
              onClick={() => clickable && onStepClick(index)}
              disabled={!clickable}
              role="tab"
              aria-selected={state === "active"}
              className={`flex items-center gap-2.5 bg-none border-0 p-0 ${
                clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
              }`}
            >
              <span className={dotClass}>
                {state === "done" ? "✓" : index + 1}
              </span>
              <span className={`${labelClass} hidden md:block`}>{step.label}</span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={`h-[1.5px] flex-1 mx-2.5 transition-colors duration-300 ${
                  index < currentStep ? "bg-accent-dim" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
