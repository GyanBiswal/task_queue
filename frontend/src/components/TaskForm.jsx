import { useState } from 'react'
import { submitTask } from '../api/tasks'

const TASK_NAMES = ['send_email', 'generate_report', 'default']

export default function TaskForm({ onSubmitted }) {
  const [name, setName] = useState('send_email')
  const [priority, setPriority] = useState('medium')
  const [maxRetries, setMaxRetries] = useState(3)
  const [payload, setPayload] = useState('{\n  "to": "test@example.com"\n}')
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    let parsedPayload
    try {
      parsedPayload = JSON.parse(payload)
    } catch {
      setError('Payload instantiation halted: Invalid raw JSON format.')
      return
    }

    setLoading(true)
    try {
      await submitTask({
        name,
        payload: parsedPayload,
        priority,
        max_retries: maxRetries,
        delay_seconds: delaySeconds > 0 ? delaySeconds : undefined,
      })
      onSubmitted()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Engine pipeline allocation rejected.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-xl">
      <h2 className="text-sm font-bold text-white tracking-wide mb-5 uppercase font-mono text-zinc-400">
        // Dispatched Core Pipeline Input
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Top Input Row: Task Type and Priority Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Task Type</label>
            <select 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
            >
              {TASK_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Priority Tier</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value)} 
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
            >
              <option value="high">🔴 High [Strict FIFO]</option>
              <option value="medium">🟡 Medium [Standard]</option>
              <option value="low">🟢 Low [Background]</option>
            </select>
          </div>
        </div>

        {/* Middle Input Row: Retries and Timing Delay Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Max Execution Retries</label>
            <input
              type="number" min={0} max={10}
              value={maxRetries}
              onChange={e => setMaxRetries(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Delay Interval <span className="text-zinc-600 font-sans normal-case ml-1 font-normal">(0 = immediate execution)</span>
            </label>
            <input
              type="number" min={0} max={86400}
              value={delaySeconds}
              onChange={e => setDelaySeconds(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
            />
          </div>
        </div>

        {/* Context Payload Text Block */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Context Metadata Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={e => setPayload(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 font-mono text-xs bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all resize-y"
          />
        </div>

        {/* Real-time Ticking Delay Execution Preview Panel */}
        {delaySeconds > 0 && (
          <div className="text-xs font-mono font-medium text-blue-400 bg-blue-950/20 border border-blue-900/30 rounded-lg px-4 py-2.5 flex items-center gap-2 select-none shadow-[0_0_15px_rgba(59,130,246,0.05)]">
            <span className="animate-pulse">⏰</span>
            <span>
              CRON_SCHEDULER_INTENT: Task execution window opens at{' '}
              <strong className="text-white bg-blue-500/10 px-1.5 py-0.5 border border-blue-500/20 rounded">
                {new Date(Date.now() + delaySeconds * 1000).toLocaleTimeString()}
              </strong>
              {' '}(+{delaySeconds}s epoch delta offset).
            </span>
          </div>
        )}

        {/* Error Console Reporting Module */}
        {error && (
          <div className="text-xs font-mono font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
            🚨 EXCEPTION_FAULT: {error}
          </div>
        )}

        {/* Dynamic Submission Control Pipeline Action */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs tracking-wider uppercase border text-white transition-all duration-150 shadow-[0_0_20px_rgba(79,70,229,0.08)] ${
            loading 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 active:scale-[0.995]'
          }`}
        >
          {loading 
            ? 'Allocating Execution Pipeline...' 
            : `Queue Task Pipeline ${delaySeconds > 0 ? `[Deferred T+${delaySeconds}s]` : '[Immediate Dispatch]'} →`
          }
        </button>
      </form>
    </div>
  )
}