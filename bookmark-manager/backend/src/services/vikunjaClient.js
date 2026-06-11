// Thin Vikunja API client.
import axios from 'axios';

const base = () => (process.env.VIKUNJA_API_URL || '').replace(/\/+$/, '');
const token = () => process.env.VIKUNJA_TOKEN || '';

export function isConfigured() { return !!(base() && token()); }

function client() {
  return axios.create({
    baseURL: base(),
    timeout: 10000,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
  });
}

export async function getTasks(filter = 'all') {
  if (!isConfigured()) throw new Error('Vikunja is not configured');
  // /tasks/all returns all assigned tasks
  const { data } = await client().get('/tasks/all', { params: { sort_by: 'due_date' } });
  const tasks = Array.isArray(data) ? data : (data?.tasks || []);
  const now = Date.now();
  return tasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'open') return !t.done;
    const due = t.due_date && t.due_date !== '0001-01-01T00:00:00Z' ? new Date(t.due_date).getTime() : null;
    if (filter === 'overdue') return !t.done && due && due < now;
    if (filter === 'today')   return !t.done && due && (due - now) < 86_400_000 && due > now - 86_400_000;
    if (filter === 'week')    return !t.done && due && (due - now) < 7 * 86_400_000;
    return true;
  });
}

export async function createTask({ projectId, title, description }) {
  if (!isConfigured()) throw new Error('Vikunja is not configured');
  if (!projectId) throw new Error('projectId is required');
  const { data } = await client().put(`/projects/${projectId}/tasks`, { title, description });
  return data;
}

export async function markDone(taskId, done = true) {
  if (!isConfigured()) throw new Error('Vikunja is not configured');
  const { data } = await client().post(`/tasks/${taskId}`, { done });
  return data;
}

export async function listProjects() {
  if (!isConfigured()) throw new Error('Vikunja is not configured');
  const { data } = await client().get('/projects');
  return data;
}
