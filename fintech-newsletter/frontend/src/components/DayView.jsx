import { SectionBlock } from "./SectionBlock.jsx";
import { TopCardsBlock } from "./TopCardsBlock.jsx";
import { SynthesisBlock } from "./SynthesisBlock.jsx";

export function DayView({
  day,
  sectionsMeta,
  canFetch,
  loadingKey,
  sectionErrors,
  onFetch,
  onRegenerate,
  regenerating,
  topCardsLoading,
  topCardsError,
  onGenerateTopCards,
}) {
  if (!day) return null;
  const [ccSection, coBrandSection, ...restSections] = sectionsMeta;

  return (
    <div>
      {ccSection && (
        <SectionBlock
          section={ccSection}
          data={day.sections?.[ccSection.key]}
          loading={loadingKey === ccSection.key}
          error={sectionErrors?.[ccSection.key]}
          onFetch={onFetch}
          canFetch={canFetch}
        />
      )}
      {coBrandSection && (
        <SectionBlock
          section={coBrandSection}
          data={day.sections?.[coBrandSection.key]}
          loading={loadingKey === coBrandSection.key}
          error={sectionErrors?.[coBrandSection.key]}
          onFetch={onFetch}
          canFetch={canFetch}
        />
      )}
      <TopCardsBlock topCards={day.top_cards} loading={topCardsLoading} error={topCardsError} onGenerate={onGenerateTopCards} canFetch={canFetch} />
      {restSections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          data={day.sections?.[section.key]}
          loading={loadingKey === section.key}
          error={sectionErrors?.[section.key]}
          onFetch={onFetch}
          canFetch={canFetch}
        />
      ))}
      <SynthesisBlock day={day} onRegenerate={onRegenerate} regenerating={regenerating} />
    </div>
  );
}
