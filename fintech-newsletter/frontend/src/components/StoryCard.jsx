import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import { Badge } from "./Badge.jsx";
import { Field } from "./Field.jsx";

export function StoryCard({ story, sectionLabel, highlight }) {
  const [open, setOpen] = useState(true);
  const accent = highlight ? "from-[#C7A252] via-[#e8cd85] to-[#C7A252]" : "from-[#3F6E67] via-[#6f9a92] to-[#3F6E67]";
  return (
    <div className="relative bg-[#F5F1E8] rounded-md border border-[#C7A252]/30 shadow-sm overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${accent}`} />
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 pt-6 flex items-start justify-between gap-4">
        <div>
          {sectionLabel && <Badge tone={highlight ? "gold" : "teal"}>{sectionLabel}</Badge>}
          <h3 className="mt-2 font-serif text-lg text-[#1E2430] leading-snug tracking-tight">{story.title}</h3>
        </div>
        {open ? <ChevronUp className="shrink-0 mt-1 text-[#8a7644]" size={18} /> : <ChevronDown className="shrink-0 mt-1 text-[#8a7644]" size={18} />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 text-sm text-[#3a3f4a] font-sans">
          <Field label="Before" value={story.before} />
          <Field label="What's Changing" value={story.change} />
          <Field label="What Happens Next" value={story.next} />
          <Field label="Impact & Relevance" value={story.impact} />
          <div className="mt-3 p-3 rounded-sm bg-[#10192B] text-[#F5F1E8]">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#C7A252]">What Can We Do About It</span>
            <p className="mt-1 leading-relaxed">{story.action_item}</p>
          </div>
          {story.link && (
            <a href={story.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#3F6E67] hover:text-[#10192B] text-xs font-mono mt-1">
              Source <ArrowUpRight size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
