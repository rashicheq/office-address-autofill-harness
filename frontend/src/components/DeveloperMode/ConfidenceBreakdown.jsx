const LABELS = {
  nameMatch: "Name-match strength",
  completeness: "Address completeness",
  formattingIntegrity: "Formatting integrity",
  rankingCertainty: "Ranking certainty",
};

export default function ConfidenceBreakdown({ confidence }) {
  if (!confidence) return null;

  if (confidence.notApplicable) {
    return <div className="confidence confidence-na">N/A — {confidence.reason}</div>;
  }

  return (
    <div className="confidence-breakdown">
      <div className="confidence-total">{confidence.score}%</div>
      <div className="confidence-components">
        {Object.entries(confidence.breakdown).map(([key, c]) => (
          <div className="confidence-row" key={key}>
            <span className="confidence-label">{LABELS[key] || key}</span>
            <div className="confidence-bar-track">
              <div className="confidence-bar-fill" style={{ width: `${Math.round(c.value * 100)}%` }} />
            </div>
            <span className="confidence-value">{Math.round(c.value * 100)}%</span>
            <span className="confidence-weight">× {Math.round(c.weight * 100)}% weight</span>
          </div>
        ))}
      </div>
    </div>
  );
}
