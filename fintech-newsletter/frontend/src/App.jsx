import { useState, useEffect, useCallback } from "react";
import { Newspaper, Calendar, Search, Filter, Database, Trash2, AlertCircle } from "lucide-react";
import {
  fetchSectionMeta,
  fetchSection as apiFetchSection,
  regenerateSynthesis as apiRegenerateSynthesis,
  generateTopCards as apiGenerateTopCards,
  listBriefs,
  clearAllBriefs as apiClearAllBriefs,
} from "./api/client.js";
import { DayView } from "./components/DayView.jsx";
import { BackendDashboard } from "./components/BackendDashboard.jsx";
import { StoryCard } from "./components/StoryCard.jsx";

const TODAY = () => new Date().toISOString().slice(0, 10);
const PRETTY_DATE = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function App() {
  const [sectionsMeta, setSectionsMeta] = useState([]);
  const [briefs, setBriefs] = useState({});
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(TODAY());
  const [loadingKey, setLoadingKey] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sectionErrors, setSectionErrors] = useState({});
  const [topCardsLoading, setTopCardsLoading] = useState(false);
  const [topCardsError, setTopCardsError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [actionOnly, setActionOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [metaRes, briefsRes] = await Promise.all([fetchSectionMeta(), listBriefs()]);
        setSectionsMeta(metaRes.sections);
        setBriefs(briefsRes.briefs);
        const dates = Object.keys(briefsRes.briefs).sort();
        if (dates.length) setSelectedDate(dates[dates.length - 1]);
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const regenerateSynthesisForDate = useCallback(async (date) => {
    setRegenerating(true);
    try {
      const { day } = await apiRegenerateSynthesis(date);
      setBriefs((prev) => ({ ...prev, [date]: day }));
    } catch {
      // Non-fatal — the backend already handles synthesis failure by
      // leaving the day unchanged; a network-level failure here just means
      // this pass didn't update.
    } finally {
      setRegenerating(false);
    }
  }, []);

  const fetchSection = useCallback(
    async (sectionKey) => {
      const date = TODAY();
      setLoadingKey(sectionKey);
      setSectionErrors((prev) => ({ ...prev, [sectionKey]: null }));
      try {
        const { day } = await apiFetchSection(sectionKey, date);
        setBriefs((prev) => ({ ...prev, [date]: day }));
        setSelectedDate(date);
        setActiveTab("today");
        regenerateSynthesisForDate(date);
      } catch (e) {
        setSectionErrors((prev) => ({ ...prev, [sectionKey]: `Didn't return usable data (${e.message}). Try again.` }));
      } finally {
        setLoadingKey(null);
      }
    },
    [regenerateSynthesisForDate],
  );

  const generateTopCardsForDate = useCallback(async (date) => {
    setTopCardsLoading(true);
    setTopCardsError(null);
    try {
      const { day } = await apiGenerateTopCards(date);
      setBriefs((prev) => ({ ...prev, [date]: day }));
    } catch (e) {
      setTopCardsError(`Didn't return usable data (${e.message}). Try again.`);
    } finally {
      setTopCardsLoading(false);
    }
  }, []);

  const clearAll = async () => {
    await apiClearAllBriefs();
    setBriefs({});
  };

  const sortedDates = Object.keys(briefs).sort().reverse();
  const isToday = selectedDate === TODAY();

  const allCCStories = sortedDates.flatMap((date) =>
    (briefs[date].sections?.credit_card_deep_dive?.stories || []).map((s) => ({ ...s, date })),
  );
  const filteredInsights = allCCStories.filter((s) => {
    if (actionOnly && !s.action_item) return false;
    if (search && !`${s.title} ${s.before} ${s.impact}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#EDE7DA] font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="bg-[#10192B] text-[#F5F1E8] px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#C7A252]">Credit Cards Charter</div>
          <h1 className="font-serif text-2xl mt-0.5">My Fintech Newsletter</h1>
          <p className="text-xs text-[#c8c2b4] mt-1">Fetch each section independently — each gets its own full research pass.</p>
        </div>
        <nav className="max-w-4xl mx-auto flex gap-1 mt-5">
          {[
            { id: "today", label: "Today's Brief", icon: Newspaper },
            { id: "archive", label: "Archive", icon: Calendar },
            { id: "insights", label: "CC Key Insights", icon: Filter },
            { id: "backend", label: "Backend", icon: Database },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-t-sm ${
                activeTab === t.id ? "bg-[#EDE7DA] text-[#10192B]" : "text-[#c8c2b4] hover:text-[#F5F1E8]"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {!loaded && <p className="text-sm text-[#5c6270] italic">Loading…</p>}

        {loaded && loadError && (
          <div className="bg-[#fdf1ee] border border-[#B5533C]/40 text-[#B5533C] rounded-md p-4 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Couldn't reach the backend.</p>
              <p className="mt-1">{loadError} — confirm the backend is running (`npm run dev` from the fintech-newsletter root) and reload.</p>
            </div>
          </div>
        )}

        {loaded && !loadError && (
          <>
            {activeTab === "today" && (
              <>
                <p className="font-mono text-xs text-[#8a7644] mb-5">{PRETTY_DATE(TODAY())}</p>
                <DayView
                  day={briefs[TODAY()] || { date: TODAY(), sections: {}, linkedin_angle: "", reflection_questions: [], top_cards: null }}
                  sectionsMeta={sectionsMeta}
                  canFetch={true}
                  loadingKey={loadingKey}
                  sectionErrors={sectionErrors}
                  onFetch={fetchSection}
                  onRegenerate={() => regenerateSynthesisForDate(TODAY())}
                  regenerating={regenerating}
                  topCardsLoading={topCardsLoading}
                  topCardsError={topCardsError}
                  onGenerateTopCards={() => generateTopCardsForDate(TODAY())}
                />
              </>
            )}

            {activeTab === "archive" && (
              <div className="grid sm:grid-cols-[200px_1fr] gap-6">
                <div className="space-y-1">
                  {sortedDates.length === 0 && <p className="text-sm text-[#5c6270] italic">No days fetched yet.</p>}
                  {sortedDates.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-sm font-mono ${
                        d === selectedDate ? "bg-[#10192B] text-[#F5F1E8]" : "hover:bg-[#F5F1E8] text-[#3a3f4a]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div>
                  {briefs[selectedDate] ? (
                    <>
                      <p className="font-mono text-xs text-[#8a7644] mb-5">{PRETTY_DATE(selectedDate)}</p>
                      <DayView
                        day={briefs[selectedDate]}
                        sectionsMeta={sectionsMeta}
                        canFetch={isToday}
                        loadingKey={loadingKey}
                        sectionErrors={sectionErrors}
                        onFetch={fetchSection}
                        onRegenerate={() => regenerateSynthesisForDate(selectedDate)}
                        regenerating={regenerating}
                        topCardsLoading={topCardsLoading}
                        topCardsError={topCardsError}
                        onGenerateTopCards={() => generateTopCardsForDate(selectedDate)}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-[#5c6270] italic">Select a date.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div>
                <p className="text-xs text-[#5c6270] mb-4">Every Credit Card Deep Dive story fetched across every day, in one place.</p>
                <div className="flex flex-wrap gap-3 items-center mb-6 bg-[#F5F1E8] p-3 rounded-md border border-[#C7A252]/30">
                  <div className="flex items-center gap-1.5 bg-white rounded-sm px-2 py-1.5 flex-1 min-w-[180px]">
                    <Search size={14} className="text-[#8a7644]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search insights..."
                      className="text-sm outline-none flex-1 bg-transparent"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-[#3a3f4a]">
                    <input type="checkbox" checked={actionOnly} onChange={(e) => setActionOnly(e.target.checked)} />
                    Has action item
                  </label>
                  <span className="text-xs text-[#8a7644] font-mono ml-auto">{filteredInsights.length} results</span>
                </div>

                {filteredInsights.length === 0 ? (
                  <div className="text-center py-16 text-[#5c6270]">
                    <Filter size={28} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No Credit Card Deep Dive stories match yet — fetch a few days first, or adjust filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredInsights.map((s, i) => (
                      <div key={i}>
                        <div className="font-mono text-[10px] text-[#8a7644] mb-1">{s.date}</div>
                        <StoryCard story={s} highlight />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "backend" && <BackendDashboard briefs={briefs} sectionsMeta={sectionsMeta} />}

            {sortedDates.length > 0 && (
              <div className="mt-14 pt-4 border-t border-[#C7A252]/20 flex justify-end">
                <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-[#8a7644] hover:text-[#B5533C]">
                  <Trash2 size={12} /> Clear all saved data
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
