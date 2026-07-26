export function Badge({ children, tone = "gold" }) {
  const tones = {
    gold: "bg-[#C7A252] text-[#10192B]",
    teal: "bg-[#3F6E67] text-[#F5F1E8]",
  };
  return (
    <span className={`inline-block text-[10px] font-mono tracking-[0.18em] uppercase px-2 py-1 rounded-sm ${tones[tone]}`}>
      {children}
    </span>
  );
}
