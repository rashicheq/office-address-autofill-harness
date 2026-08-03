import { useState } from "react";

const DESIGNATIONS = [
  "Product Designer",
  "Software Engineer",
  "Product Manager",
  "Business Analyst",
  "Sales Executive",
  "Operations Manager",
  "Other",
];

// First screen of the Career Info step (Figma: "Add your company details").
// Only `companyName` feeds anything downstream (it becomes the office-name
// search query on the next screen) — designation/email/experience are
// collected for onboarding-flow fidelity but aren't part of what this
// harness validates (address logic), so they're deliberately unvalidated.
export default function CompanyDetailsView({ onContinue }) {
  const [companyName, setCompanyName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("");

  const canContinue = companyName.trim().length > 0;

  return (
    <div className="onboarding-card">
      <label className="field">
        Your Company Name
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. CheQ Digital Private Limited" />
      </label>

      <label className="field">
        Select Designation
        <select value={designation} onChange={(e) => setDesignation(e.target.value)}>
          <option value="">Select Designation</option>
          {DESIGNATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Work Email ID
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </label>

      <label className="field">
        Total No. of Years of Experience
        <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3" />
      </label>

      <div className="editor-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={!canContinue}
          onClick={() => onContinue({ companyName: companyName.trim(), designation, email, experience })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
