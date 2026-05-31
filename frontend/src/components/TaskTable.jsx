import StatusBadge from './StatusBadge'

const PRIORITY_COLOR = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-emerald-400' }

function fmt(iso) {
  if (!iso || iso === 'null') return '—'
  return new Date(iso).toLocaleTimeString()
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
              <th className="px-6 py-4">Dispatched</th>
              <th className="px-6 py-4">Mutation</th>
              <th className="px-6 py-4">Trace Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-mono text-zinc-300">
            {sorted.map(task => (
              <tr key={task.id} className="hover:bg-zinc-900/30 transition-colors duration-700">
                <td className="px-6 py-4">
                  <div className="font-bold text-white font-sans text-xs">{task.name}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5 tracking-tight">
                    {task.id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[11px]">
                  <span className={`font-bold ${PRIORITY_COLOR[task.priority] ?? 'text-zinc-400'}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-white font-bold tabular-nums">
                  {task.retry_count} <span className="text-zinc-700 mx-0.5">/</span> {task.max_retries}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-500">{fmt(task.created_at)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-500">{fmt(task.updated_at)}</td>
                <td className="px-6 py-4 max-w-[240px]">
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