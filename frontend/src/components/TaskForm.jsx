import { useState } from 'react'
import { submitTask } from '../api/tasks'

const TASK_NAMES = ['send_email', 'generate_report', 'default']

export default function TaskForm({ onSubmitted }) {
  const [name, setName] = useState('send_email')
  const [priority, setPriority] = useState('medium')
  const [maxRetries, setMaxRetries] = useState(3)
  const [payload, setPayload] = useState('{\n  "to": "test@example.com"\n}')
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
      await submitTask({ name, payload: parsedPayload, priority, max_retries: maxRetries })
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
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
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

        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Max Execution Retries</label>
          <input
            type="number" min={0} max={10}
            value={maxRetries}
            onChange={e => setMaxRetries(Number(e.target.value))}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg font-bold text-xs tracking-wider uppercase border text-white transition-all duration-150 shadow-[0_0_20px_rgba(79,70,229,0.1)] ${
            loading 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 active:scale-[0.99]'
          }`}
        >
          {loading ? 'Submitting...' : 'Queue Task →'}
        </button>

        <div className="md:col-span-4 mt-2">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Context Metadata Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={e => setPayload(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 font-mono text-xs bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all resize-y"
          />
        </div>

        {error && (
          <div className="md:col-span-4 text-xs font-mono font-semibold text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
            🚨 ERROR: {error}
          </div>
        )}
      </form>
    </div>
  )
}