import StatusBadge from './StatusBadge'

export default function DLQPanel({ tasks }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-zinc-950/30 border border-emerald-950/40 rounded-xl p-8 text-center text-emerald-500/80 text-xs font-mono shadow-inner">
        // OK: Poison Pill Queue cleanly purged. No exceptions reported.
      </div>
    )
  }

  return (
    <div className="bg-zinc-950 border border-red-950/40 rounded-xl p-6 shadow-xl">
      <h2 className="text-xs font-bold text-purple-400 font-mono tracking-widest uppercase flex items-center gap-2 mb-4">
        ⚠️ Core_Vault::Poison_Pill_Dump ({tasks.length})
      </h2>
      
      <div className="grid grid-cols-1 gap-3">
        {tasks.map(task => (
          <div key={task.id} className="border border-purple-950/60 rounded-lg p-4 bg-purple-950/10 hover:border-purple-900/60 transition-colors">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-white text-xs font-sans">{task.name}</h3>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5 select-all">UUID: {task.id}</div>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] font-mono border-t border-zinc-900 pt-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider w-24">Exception Trace:</span>
                <span className="font-semibold text-red-400 bg-red-950/40 border border-red-900/30 rounded px-2 py-0.5 truncate flex-1">
                  {task.error && task.error !== 'null' ? task.error : 'CRASH_TRACE_EMPTY'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider w-24">Lifecycle Dump:</span>
                <span className="text-zinc-400">
                  Worker aborted processing after executing {task.retry_count} / {task.max_retries} attempts.
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}