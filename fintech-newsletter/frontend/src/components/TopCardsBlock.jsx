import { RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "./Badge.jsx";
import { Field } from "./Field.jsx";

export function TopCardsBlock({ topCards, loading, error, onGenerate, canFetch }) {
  return (
    <div className="mb-8 bg-[#F5F1E8] rounded-md border border-[#C7A252]/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-[#8a7644]">Top Cards of the Month</h2>
        {canFetch && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-[#C7A252]/50 text-[#8a7644] hover:bg-[#C7A252]/10 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {topCards ? "Regenerate" : "Generate"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[#B5533C] mb-2 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
      {!topCards ? (
        <p className="text-sm text-[#8a8f9c] italic">
          Not generated yet — works best after fetching Co-Branded Cards, Patterns, Market Shifts, and User Sentiment above, so it can reason from real signal rather than guessing.
        </p>
      ) : (
        <div>
          <p className="text-sm font-serif text-[#1E2430] mb-4">
            This month's driving shift: <span className="italic">{topCards.month_theme}</span>
          </p>
          <div className="grid gap-4">
            {(topCards.standout_cards || []).map((c, i) => (
              <div key={i} className="bg-white rounded-md border border-[#C7A252]/30 p-4">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3 className="font-serif text-base text-[#1E2430]">{c.card_name}</h3>
                  <Badge tone="teal">{c.co_brand_partner}</Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm text-[#3a3f4a]">
                  <Field label="Why It Stands Out" value={c.why_standout} />
                  <Field label="User Benefit" value={c.user_benefit} />
                  <Field label="Behavior Shift Behind It" value={c.driving_behavior_shift} />
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  <div className="p-3 rounded-sm bg-[#10192B] text-[#F5F1E8]">
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#C7A252]">Product-Led Proposition</span>
                    <p className="mt-1 text-sm leading-relaxed">{c.product_led_proposition}</p>
                  </div>
                  <div className="p-3 rounded-sm bg-[#10192B] text-[#F5F1E8]">
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#C7A252]">Business-Led Proposition</span>
                    <p className="mt-1 text-sm leading-relaxed">{c.business_led_proposition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {topCards.synthesis_note && (
            <p className="text-sm text-[#5c6270] italic mt-4 border-l-2 border-[#C7A252] pl-3">{topCards.synthesis_note}</p>
          )}
        </div>
      )}
    </div>
  );
}
