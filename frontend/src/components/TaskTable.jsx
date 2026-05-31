import StatusBadge from './StatusBadge'

const PRIORITY_COLOR = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-emerald-400' }

function fmt(iso) {
  if (!iso || iso === 'null') return '—'
  return new Date(iso).toLocaleTimeString()
}

// Sub-component: High-contrast Dark Countdown Telemetry
function RunAt({ iso }) {
  if (!iso || iso === 'null') {
    return <span className="text-zinc-600 font-sans italic">immediate</span>
  }

  const target = new Date(iso)
  const diff   = Math.round((target - Date.now()) / 1000)

  if (diff > 0) {
    return (
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-blue-400 font-bold tracking-wide">⏰ in {diff}s</span>
        <span className="text-[10px] text-zinc-500 font-semibold">{target.toLocaleTimeString()}</span>
      </div>
    )
  }
  
  return <span className="text-zinc-400 font-semibold">{target.toLocaleTimeString()}</span>
}

export default function TaskTable({ tasks }) {
  const sorted = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
        // Empty node block: No operational tasks detected in active rotation.
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden bg-zinc-950 border border-zinc-900 rounded-xl shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-zinc-400">
          <thead className="bg-zinc-900/50 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900">
            <tr>
              <th className="px-6 py-4">Task Metadata</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Retries Run</th>
              <th className="px-6 py-4">Schedule Frame</th>
              <th className="px-6 py-4">Dispatched</th>
              <th className="px-6 py-4">Trace Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-mono text-zinc-300">
            {sorted.map(task => (
              <tr key={task.id} className="hover:bg-zinc-900/30 transition-colors duration-200">
                
                {/* Task Name & UUID Block */}
                <td className="px-6 py-4">
                  <div className="font-bold text-white font-sans text-xs">{task.name}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5 tracking-tight select-all">
                    {task.id}
                  </div>
                </td>
                
                {/* Priority Field */}
                <td className="px-6 py-4 whitespace-nowrap text-[11px]">
                  <span className={`font-bold uppercase tracking-wider ${PRIORITY_COLOR[task.priority] ?? 'text-zinc-400'}`}>
                    {task.priority}
                  </span>
                </td>
                
                {/* Status Badge Component */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={task.status} />
                </td>
                
                {/* Retry Tracker Fraction */}
                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-white font-bold tabular-nums">
                  {task.retry_count} <span className="text-zinc-700 mx-0.5">/</span> {task.max_retries}
                </td>
                
                {/* Run At Chrono Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <RunAt iso={task.run_at} />
                </td>
                
                {/* Base Ingestion Time */}
                <td className="px-6 py-4 whitespace-nowrap text-zinc-500">{fmt(task.created_at)}</td>
                
                {/* Operational Execution Logs Output */}
                <td className="px-6 py-4 max-w-[200px]">
                  <div className="truncate text-xs">
                    {task.result && task.result !== 'null' ? (
                      <span className="text-emerald-400 font-semibold">{task.result}</span>
                    ) : task.error && task.error !== 'null' ? (
                      <span className="text-red-400 font-semibold">{task.error}</span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </div>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}