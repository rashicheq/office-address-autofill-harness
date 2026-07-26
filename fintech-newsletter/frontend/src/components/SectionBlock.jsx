import { RefreshCw, AlertCircle } from "lucide-react";
import { StoryCard } from "./StoryCard.jsx";

export function SectionBlock({ section, data, loading, error, onFetch, canFetch }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-mono text-xs tracking-[0.25em] uppercase ${section.highlight ? "text-[#8a7644]" : "text-[#5c6270]"}`}>
          {section.label}
        </h2>
        {canFetch && (
          <button
            onClick={() => onFetch(section.key)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm border border-[#C7A252]/50 text-[#8a7644] hover:bg-[#C7A252]/10 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {data?.fetched_at ? "Refetch" : "Fetch"}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#B5533C] mb-2 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>
      )}
      {data?.stories?.length ? (
        <div className="grid gap-4">
          {data.stories.map((s, i) => <StoryCard story={s} key={i} highlight={section.highlight} />)}
        </div>
      ) : data?.fetched_at ? (
        <p className="text-sm text-[#5c6270] italic">Nothing significant found.</p>
      ) : (
        <p className="text-sm text-[#8a8f9c] italic">Not fetched yet today.</p>
      )}
    </div>
  );
}
