export default function StatTable({ title, stats }) {
  // stats: { label, value, suffix? }[]
  return (
    <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
      <div className="font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between border-b border-white/10 py-1"
          >
            <span className="text-muted">{s.label}</span>
            <span className="font-medium">
              {s.value}
              {s.suffix || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
