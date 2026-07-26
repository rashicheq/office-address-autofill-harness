import { useState, Fragment } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StatCard } from "./StatCard.jsx";

export function BackendDashboard({ briefs, sectionsMeta }) {
  const [expandedDate, setExpandedDate] = useState(null);
  const sortedDates = Object.keys(briefs).sort().reverse();

  const totalStoriesPerSection = Object.fromEntries(
    sectionsMeta.map((s) => [
      s.key,
      sortedDates.reduce((sum, d) => sum + (briefs[d].sections?.[s.key]?.stories || []).length, 0),
    ]),
  );
  const totalStories = Object.values(totalStoriesPerSection).reduce((a, b) => a + b, 0);
  const daysWithSynthesis = sortedDates.filter((d) => briefs[d].linkedin_angle).length;
  const daysWithTopCards = sortedDates.filter((d) => briefs[d].top_cards).length;

  return (
    <div>
      <p className="text-xs text-[#5c6270] mb-4">
        A behind-the-scenes view of what's been fetched, how it's stored, and how it's consolidated — for your own debugging/trust-checking, not for daily reading.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Days Tracked" value={sortedDates.length} />
        <StatCard label="Total Stories Stored" value={totalStories} />
        <StatCard label="Days With Synthesis" value={daysWithSynthesis} />
        <StatCard label="Days With Top Cards" value={daysWithTopCards} />
      </div>

      <div className="bg-[#F5F1E8] rounded-md border border-[#C7A252]/30 p-4 mb-6">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-[#8a7644] mb-3">Stories Collected Per Section (All Time)</h2>
        <div className="space-y-2">
          {sectionsMeta.map((s) => {
            const count = totalStoriesPerSection[s.key];
            const max = Math.max(1, ...Object.values(totalStoriesPerSection));
            return (
              <div key={s.key} className="flex items-center gap-3 text-xs">
                <span className="w-48 shrink-0 font-mono text-[#5c6270]">{s.label}</span>
                <div className="flex-1 h-3 bg-white rounded-sm overflow-hidden border border-[#C7A252]/20">
                  <div className="h-full bg-[#C7A252]" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-[#8a7644]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#F5F1E8] rounded-md border border-[#C7A252]/30 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#C7A252]/30">
              <th className="text-left p-2 font-mono uppercase text-[#8a7644] whitespace-nowrap">Date</th>
              {sectionsMeta.map((s) => (
                <th key={s.key} className="text-center p-2 font-mono uppercase text-[#8a7644] whitespace-nowrap" title={s.label}>
                  {s.label.split(" ")[0]}
                </th>
              ))}
              <th className="text-center p-2 font-mono uppercase text-[#8a7644]">Top Cards</th>
              <th className="text-center p-2 font-mono uppercase text-[#8a7644]">Synthesis</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map((d) => (
              <Fragment key={d}>
                <tr className="border-b border-[#C7A252]/10">
                  <td className="p-2 font-mono whitespace-nowrap">{d}</td>
                  {sectionsMeta.map((s) => {
                    const sec = briefs[d].sections?.[s.key];
                    return (
                      <td key={s.key} className="text-center p-2">
                        {sec ? <span className="text-[#3F6E67] font-semibold">{sec.stories?.length ?? 0}</span> : <span className="text-[#c8c2b4]">—</span>}
                      </td>
                    );
                  })}
                  <td className="text-center p-2">{briefs[d].top_cards ? <span className="text-[#C7A252] font-semibold">✓</span> : <span className="text-[#c8c2b4]">—</span>}</td>
                  <td className="text-center p-2">{briefs[d].linkedin_angle ? <span className="text-[#C7A252] font-semibold">✓</span> : <span className="text-[#c8c2b4]">—</span>}</td>
                  <td className="p-2">
                    <button onClick={() => setExpandedDate(expandedDate === d ? null : d)} className="text-[#8a7644] hover:text-[#10192B]">
                      {expandedDate === d ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                </tr>
                {expandedDate === d && (
                  <tr>
                    <td colSpan={sectionsMeta.length + 3} className="p-3 bg-white">
                      <div className="mb-2 font-mono text-[10px] text-[#8a7644]">
                        Storage key: <code className="bg-[#EDE7DA] px-1.5 py-0.5 rounded-sm">data/briefs/{d}.json</code>
                      </div>
                      <pre className="text-[10px] leading-relaxed bg-[#10192B] text-[#c8e6d5] p-3 rounded-sm overflow-x-auto max-h-80 overflow-y-auto">
                        {JSON.stringify(briefs[d], null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {sortedDates.length === 0 && <p className="text-sm text-[#5c6270] italic p-4">No data stored yet.</p>}
      </div>
    </div>
  );
}
