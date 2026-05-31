const CONFIGS = {
  scheduled: { classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_12px_rgba(56,189,248,0.05)]', label: 'SCHEDULED' },
  pending:   { classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'PENDING' },
  running:   { classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]', label: 'RUNNING' },
  done:      { classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'DONE' },
  dead:      { classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]', label: 'DEAD' },
}

export default function StatusBadge({ status }) {
  const config = CONFIGS[status] ?? CONFIGS.pending
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest border ${config.classes}`}>
      {config.label}
    </span>
  )
}