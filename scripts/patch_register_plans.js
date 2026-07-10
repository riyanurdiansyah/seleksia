const fs = require('fs');
const path = './app/register/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Type
if (!code.includes('type SubscriptionPlan =')) {
    code = code.replace(
        'import { useState, useEffect } from "react";',
        `import { useState, useEffect } from "react";\n\ntype SubscriptionPlan = {\n    id: string;\n    name: string;\n    price: number;\n    priceText: string;\n    maxCandidates: number;\n    maxTests: number;\n    features: string[];\n    isPopular: boolean;\n};`
    );
}

// 2. Add state and effect
if (!code.includes('const [dbPlans, setDbPlans] =')) {
    code = code.replace(
        'const [selectedPlan, setSelectedPlan] = useState("Free");',
        `const [selectedPlan, setSelectedPlan] = useState("Free");\n    const [dbPlans, setDbPlans] = useState<SubscriptionPlan[]>([]);\n    const [loadingPlans, setLoadingPlans] = useState(true);\n\n    useEffect(() => {\n        fetch("/api/plans")\n            .then((res) => res.json())\n            .then((data) => {\n                if (Array.isArray(data)) {\n                    setDbPlans(data);\n                    if (data.length > 0) setSelectedPlan(data[0].name);\n                }\n                setLoadingPlans(false);\n            })\n            .catch((err) => {\n                console.error("Failed to fetch plans", err);\n                setLoadingPlans(false);\n            });\n    }, []);`
    );
}

// 3. Replace the static HTML grid
const gridStart = code.indexOf('{/* Plan Free */}');
const gridEnd = code.indexOf('{/* Navigation Buttons */}');

if (gridStart !== -1 && gridEnd !== -1) {
    // Find the end of the grid div
    const textToReplace = code.substring(gridStart, gridEnd);
    
    // We need to carefully replace the entire grid content inside <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    const replacement = `
                                        {loadingPlans ? (
                                            <div className="col-span-1 md:col-span-3 text-center text-[var(--color-text-muted)] text-xs py-10 animate-pulse">
                                                Memuat paket langganan...
                                            </div>
                                        ) : (
                                            dbPlans.map((plan) => (
                                                <div 
                                                    key={plan.id}
                                                    onClick={() => setSelectedPlan(plan.name)}
                                                    className={\`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between
                                                        \${selectedPlan === plan.name 
                                                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md translate-y-[-2px]" 
                                                            : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                                                        }\`}
                                                >
                                                    {plan.isPopular && (
                                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-accent)] text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg">
                                                            Populer
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <h3 className="font-extrabold text-sm text-[var(--color-text-main)]">{plan.name}</h3>
                                                        <div className="text-lg font-black text-[var(--color-text-main)]">{plan.priceText || formatCurrency(plan.price)}</div>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-sub)] space-y-1">
                                                        <div>• {plan.maxCandidates === -1 ? 'Kandidat Tidak Terbatas' : \`Maks. \${plan.maxCandidates} Kandidat\`}</div>
                                                        <div>• {plan.maxTests === -1 ? 'Paket Tes Tidak Terbatas' : \`Maks. \${plan.maxTests} Paket Tes\`}</div>
                                                        {plan.features.map((feat, idx) => (
                                                            <div key={idx}>• {feat}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            `;
    
    // Actually the gridEnd is at `{/* Navigation Buttons */}`. The textToReplace includes the `</div></div>)}` which closes the grid and the step 3 block.
    // Let's refine the replacement string by just replacing the inner content of the grid.
    
    // First, let's find the closing tags before the navigation buttons
    const exactEndStr = `                                    </div>\n                                </div>\n                            )}\n\n                            {/* Navigation Buttons */}`;
    const gridInnerStart = code.indexOf('{/* Plan Free */}');
    const exactEndIndex = code.indexOf(exactEndStr);
    
    if (exactEndIndex !== -1) {
        const fullToReplace = code.substring(gridInnerStart, exactEndIndex);
        const newInner = `
                                        {loadingPlans ? (
                                            <div className="col-span-1 md:col-span-3 text-center text-[var(--color-text-muted)] text-xs py-10 animate-pulse">
                                                Memuat paket langganan...
                                            </div>
                                        ) : (
                                            dbPlans.map((plan) => (
                                                <div 
                                                    key={plan.id}
                                                    onClick={() => setSelectedPlan(plan.name)}
                                                    className={\`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between
                                                        \${selectedPlan === plan.name 
                                                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-md translate-y-[-2px]" 
                                                            : "border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-strong)]"
                                                        }\`}
                                                >
                                                    {plan.isPopular && (
                                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-accent)] text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg">
                                                            Populer
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <h3 className="font-extrabold text-sm text-[var(--color-text-main)]">{plan.name}</h3>
                                                        <div className="text-lg font-black text-[var(--color-text-main)]">{plan.priceText || formatCurrency(plan.price)}</div>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-sub)] space-y-1">
                                                        <div>• {plan.maxCandidates === -1 ? 'Kandidat Tidak Terbatas' : \`Maks. \${plan.maxCandidates} Kandidat\`}</div>
                                                        <div>• {plan.maxTests === -1 ? 'Paket Tes Tidak Terbatas' : \`Maks. \${plan.maxTests} Paket Tes\`}</div>
                                                        {plan.features.map((feat, idx) => (
                                                            <div key={idx}>• {feat}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
`;
        code = code.replace(fullToReplace, newInner);
    }
}

// 4. Update the UI text in Step 3 left panel summary
const oldSummary = `{selectedPlan === "Free" && "Gratis"}
                                        {selectedPlan === "Starter" && \`\${formatCurrency(290000)} / bln\`}
                                        {selectedPlan === "Business" && \`\${formatCurrency(750000)} / bln\`}`;

const newSummary = `{dbPlans.find(p => p.name === selectedPlan)?.priceText || formatCurrency(dbPlans.find(p => p.name === selectedPlan)?.price || 0)}`;

code = code.replace(oldSummary, newSummary);

fs.writeFileSync(path, code);
console.log('Patched');
