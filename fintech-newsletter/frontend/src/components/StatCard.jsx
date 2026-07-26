export function StatCard({ label, value }) {
  return (
    <div className="bg-[#10192B] text-[#F5F1E8] rounded-md p-3">
      <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#C7A252]">{label}</div>
      <div className="font-serif text-2xl mt-1">{value}</div>
    </div>
  );
}
