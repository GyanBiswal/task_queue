import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, fetchDLQ } from './api/tasks'
import TaskForm   from './components/TaskForm'
import TaskTable  from './components/TaskTable'
import DLQPanel   from './components/DLQPanel'

const POLL_INTERVAL = 3000

export default function App() {
  const [tasks, setTasks] = useState([])
  const [dlqTasks, setDlqTasks] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [tab, setTab] = useState('tasks')

  // Force dark mode layout class rules onto the HTML root natively
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([fetchTasks(), fetchDLQ()])
      setTasks(t)
      setDlqTasks(d)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Core cluster sync error:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [refresh])

  const activeTasks = tasks.filter(t => t.status !== 'dead')

  const stats = {
    total:   activeTasks.length,
    pending: activeTasks.filter(t => t.status === 'pending').length,
    running: activeTasks.filter(t => t.status === 'running').length,
    done:    activeTasks.filter(t => t.status === 'done').length,
    dead:    dlqTasks.length,
  }

  const statCard = (label, value, textColorClass) => (
    <div key={label} className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow-md flex-1 min-w-[150px]">
      <div className={`text-3xl font-black tracking-tight ${textColorClass}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">
        {label}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090b] font-sans antialiased text-zinc-200 selection:bg-indigo-500/30">
      
      {/* Structural Header Navigation */}
      <header className="bg-zinc-950/80 border-b border-zinc-900 px-8 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <span className="text-xl inline-flex animate-spin [animation-duration:8s]">⚙️</span>
            <span className="font-extrabold text-sm tracking-wider text-white uppercase font-mono">
              Broker_Node::Cluster_01
            </span>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Live pulsing cluster health indicator */}
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-zinc-400 font-mono tracking-tight bg-zinc-900 px-3 py-1 border border-zinc-800 rounded-md">
              {lastUpdated ? `LIVE_SYNC: ${lastUpdated}` : 'INITIALIZING_BUS...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Dynamic Metric Counter Panels */}
        <div className="flex gap-4 flex-wrap w-full">
          {statCard('Total Active', stats.total,   'text-white')}
          {statCard('In Queue',     stats.pending, 'text-amber-400')}
          {statCard('Processing',   stats.running, 'text-blue-400')}
          {statCard('Resolved',     stats.done,    'text-emerald-400')}
          {statCard('Dead (DLQ)',   stats.dead,    'text-purple-400')}
        </div>

        {/* Input Pipeline Control */}
        <TaskForm onSubmitted={refresh} />

        {/* Routing Controls & Output Segment */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex gap-1.5 bg-zinc-900 rounded-xl p-1 w-fit border border-zinc-800/60">
            <button 
              className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all ${
                tab === 'tasks' 
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50' 
                  : 'text-zinc-400 hover:text-zinc-200 bg-transparent'
              }`}
              onClick={() => setTab('tasks')}
            >
              Cluster Logs ({stats.total})
            </button>
            <button 
              className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all ${
                tab === 'dlq' 
                  ? 'bg-purple-950/40 text-purple-400 shadow-sm border border-purple-900/40' 
                  : 'text-zinc-400 hover:text-purple-400 bg-transparent'
              }`}
              onClick={() => setTab('dlq')}
            >
              ☠️ Vault Traces ({stats.dead})
            </button>
          </div>

          <div className="w-full">
            {tab === 'tasks' ? (
              <TaskTable tasks={activeTasks} />
            ) : (
              <DLQPanel tasks={dlqTasks} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}