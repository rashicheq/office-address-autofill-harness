export function Field({ label, value }) {
  return (
    <div>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#8a7644]">{label}</span>
      <p className="leading-relaxed mt-0.5">{value}</p>
    </div>
  );
}
