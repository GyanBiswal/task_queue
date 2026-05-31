import axios from 'axios'

const BASE = ''   // empty string = use Vite proxy in dev, relative URL in prod

export const fetchTasks = () =>
  axios.get(`${BASE}/tasks`).then(r => r.data)

export const fetchDLQ = () =>
  axios.get(`${BASE}/dlq`).then(r => r.data)

export const submitTask = (payload) =>
  axios.post(`${BASE}/tasks`, payload).then(r => r.data)