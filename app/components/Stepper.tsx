"use client";

interface StepperProps {
    currentStep: number;
}

const steps = [
    { label: "Persiapan" },
    { label: "Instruksi" },
    { label: "Ujian" },
    { label: "Selesai" },
];

export default function Stepper({ currentStep }: StepperProps) {
    return (
        <nav aria-label="Progress" className="w-full">
            <ol className="flex items-center justify-between w-full" role="list">
                {steps.map((step, idx) => {
                    const isCompleted = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    const isLast = idx === steps.length - 1;

                    return (
                        <li
                            key={step.label}
                            className={`relative ${!isLast ? "flex-1" : ""}`}
                        >
                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className="absolute inset-0 flex items-center"
                                    aria-hidden="true"
                                >
                                    <div
                                        className={`h-0.5 w-full transition-colors duration-500 ${isCompleted
                                                ? "bg-gradient-to-r from-[var(--color-success)] to-[var(--color-success)]"
                                                : "bg-[var(--color-border)]"
                                            }`}
                                    />
                                </div>
                            )}

                            {/* Step circle */}
                            <div
                                className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${isCompleted
                                        ? "bg-[var(--color-success)] text-white shadow-[0_4px_12px_var(--color-success-glow)]"
                                        : isCurrent
                                            ? "bg-gradient-to-br from-primary to-accent text-white shadow-[var(--shadow-glow)] ring-4 ring-[var(--color-primary-light)]"
                                            : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                                    }`}
                            >
                                {isCompleted ? (
                                    <span className="material-symbols-outlined text-white text-sm">
                                        check
                                    </span>
                                ) : isCurrent ? (
                                    <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                                ) : (
                                    <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={`absolute -bottom-6 left-4 -translate-x-1/2 text-xs whitespace-nowrap transition-colors font-semibold ${isCompleted
                                        ? "text-[var(--color-success)]"
                                        : isCurrent
                                            ? "text-primary"
                                            : "text-[var(--color-text-muted)]"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
