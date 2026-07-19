export default function AddressCard({ result, selected, onSelect }) {
  const text = (result.addressLines || []).filter(Boolean).join(", ");
  return (
    <div
      className={selected ? "address-card selected" : "address-card"}
      onClick={() => onSelect(result)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(result)}
    >
      <span className={selected ? "radio radio-checked" : "radio"} aria-hidden="true" />
      <span className="address-card-text">{text}</span>
      <span className="overflow-dots" aria-hidden="true">
        ⋮
      </span>
    </div>
  );
}
