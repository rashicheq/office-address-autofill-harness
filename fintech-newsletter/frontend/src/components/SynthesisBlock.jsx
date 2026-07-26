import { RefreshCw } from "lucide-react";

export function SynthesisBlock({ day, onRegenerate, regenerating }) {
  const hasAny = day && (day.linkedin_angle || (day.reflection_questions || []).length > 0);
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      <div className="bg-[#10192B] text-[#F5F1E8] rounded-md p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#C7A252]">LinkedIn Angle of the Day</span>
          <button onClick={onRegenerate} disabled={regenerating} className="text-[#C7A252] disabled:opacity-50">
            <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="text-sm mt-2 leading-relaxed">
          {day?.linkedin_angle || (hasAny ? "" : "Fetch at least one section above — this auto-generates from what you've fetched today.")}
        </p>
      </div>
      <div className="bg-[#10192B] text-[#F5F1E8] rounded-md p-4">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#C7A252]">Reflection Questions</span>
        {day?.reflection_questions?.length > 0 ? (
          <ul className="text-sm mt-2 space-y-1.5 list-disc list-inside">
            {day.reflection_questions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        ) : (
          <p className="text-sm mt-2 leading-relaxed">
            {hasAny ? "" : "Fetch at least one section above — this auto-generates from what you've fetched today."}
          </p>
        )}
      </div>
    </div>
  );
}
