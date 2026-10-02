import { AssignmentTask, CRMContact, Goal, QuickNote } from '../types';

const TASKS_KEY = 'minimal_personal_plans_v1';
const CONTACTS_KEY = 'minimal_personal_contacts_v1';
const GOALS_KEY = 'minimal_personal_goals_v1';
const NOTES_KEY = 'minimal_personal_notes_v1';

// Legacy keys to clean up
const LEGACY_TASKS_KEYS = ['assignment_crm_tasks_v1'];
const LEGACY_CONTACTS_KEYS = ['assignment_crm_contacts_v1'];

function getStorageKey(baseKey: string, userId?: string | null): string {
  if (userId) {
    return `${baseKey}_user_${userId}`;
  }
  return `${baseKey}_guest`;
}

const DEFAULT_SAMPLE_NOTES: QuickNote[] = [
  {
    id: 'note-welcome-1',
    title: '💡 Ideas para esta semana',
    content: '==Prioridad clave==: Presentar el nuevo prototipo.\n\n- [x] Diseñar el boceto de la nueva propuesta\n- [ ] Comprar café en grano y té de jazmín\n- [ ] Programar **revisión final** para el viernes',
    color: '#FF99AA',
    isPinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-welcome-2',
    title: '📌 Recordatorio rápido',
    content: 'Revisar la suscripción antes de fin de mes y hacer respaldo del proyecto. Recuerda que la entrega es el ==28 de octubre==.',
    color: '#EAB308',
    isPinned: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const DEFAULT_SAMPLE_GOALS: Goal[] = [
  {
    id: 'goal-30-days-challenge',
    title: '20 cosas en los próximos 30 días',
    targetDays: 30,
    targetCount: 20,
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    color: '#FF99AA',
    tasks: [
      { id: 'gt-1', title: 'Caminar o hacer 30 minutos de ejercicio diario', completed: true, completedAt: new Date().toISOString(), priority: 'urgent_important' },
      { id: 'gt-2', title: 'Leer 1 libro de desarrollo o habilidad profesional', completed: true, completedAt: new Date().toISOString(), priority: 'urgent_important' },
      { id: 'gt-3', title: 'Organizar y limpiar el espacio de trabajo digital y físico', completed: false, priority: 'important' },
      { id: 'gt-4', title: 'Tomar 2 litros de agua diarios', completed: false, priority: 'important' },
      { id: 'gt-5', title: 'Completar revisión de metas y presupuesto financiero', completed: false, priority: 'urgent' },
      { id: 'gt-6', title: 'Aprender un nuevo concepto o herramienta técnica', completed: false, priority: 'routine' },
    ],
  },
];

export function loadGoalsFromStorage(userId?: string | null): Goal[] {
  try {
    const key = getStorageKey(GOALS_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Also check un-scoped legacy key for migration
      const legacyRaw = localStorage.getItem(GOALS_KEY);
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            saveGoalsToStorage(parsedLegacy, userId);
            return parsedLegacy;
          }
        } catch {}
      }
      return DEFAULT_SAMPLE_GOALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((g: Goal) => {
        const cleanedTasks = (g.tasks || []).map((t, idx) => ({
          ...t,
          priority: t.priority || (idx % 4 === 0 ? 'urgent_important' : idx % 4 === 1 ? 'important' : idx % 4 === 2 ? 'urgent' : 'routine'),
        }));
        if (g.description) {
          const { description, ...rest } = g;
          return { ...rest, tasks: cleanedTasks };
        }
        return { ...g, tasks: cleanedTasks };
      });
    }
    return DEFAULT_SAMPLE_GOALS;
  } catch (err) {
    console.error('Failed to parse goals from storage', err);
    return DEFAULT_SAMPLE_GOALS;
  }
}

export function saveGoalsToStorage(goals: Goal[], userId?: string | null): void {
  try {
    const key = getStorageKey(GOALS_KEY, userId);
    localStorage.setItem(key, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save goals to storage', err);
  }
}

const MOCK_TASK_IDS = new Set([
  'task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7', 'task-8'
]);

export function loadTasksFromStorage(userId?: string | null): AssignmentTask[] {
  try {
    // Remove legacy items if present
    for (const legacyKey of LEGACY_TASKS_KEYS) {
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
      }
    }

    const key = getStorageKey(TASKS_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // If guest and never had tasks, return empty array
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t: AssignmentTask) => !MOCK_TASK_IDS.has(t.id));
    }
    return [];
  } catch (err) {
    console.error('Failed to parse tasks from storage', err);
    return [];
  }
}

export function saveTasksToStorage(tasks: AssignmentTask[], userId?: string | null): void {
  try {
    const key = getStorageKey(TASKS_KEY, userId);
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks to storage', err);
  }
}

export function clearUserStorage(userId?: string | null): void {
  try {
    const taskKey = getStorageKey(TASKS_KEY, userId);
    const goalKey = getStorageKey(GOALS_KEY, userId);
    const noteKey = getStorageKey(NOTES_KEY, userId);
    localStorage.removeItem(taskKey);
    localStorage.removeItem(goalKey);
    localStorage.removeItem(noteKey);
    // Also remove global legacy keys to ensure clean isolation
    localStorage.removeItem(TASKS_KEY);
  } catch (err) {
    console.error('Failed to clear user storage', err);
  }
}

export function loadContactsFromStorage(): CRMContact[] {
  try {
    for (const legacyKey of LEGACY_CONTACTS_KEYS) {
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
      }
    }

    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((c: CRMContact) => !c.id.startsWith('contact-'));
    }
    return [];
  } catch (err) {
    console.error('Failed to parse contacts from storage', err);
    return [];
  }
}

export function saveContactsToStorage(contacts: CRMContact[]): void {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error('Failed to save contacts to storage', err);
  }
}

export function loadNotesFromStorage(userId?: string | null): QuickNote[] {
  try {
    const key = getStorageKey(NOTES_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      const legacyRaw = localStorage.getItem(NOTES_KEY);
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            saveNotesToStorage(parsedLegacy, userId);
            return parsedLegacy;
          }
        } catch {}
      }
      return DEFAULT_SAMPLE_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_NOTES;
  } catch (err) {
    console.error('Failed to parse notes from storage', err);
    return DEFAULT_SAMPLE_NOTES;
  }
}

export function saveNotesToStorage(notes: QuickNote[], userId?: string | null): void {
  try {
    const key = getStorageKey(NOTES_KEY, userId);
    localStorage.setItem(key, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save notes to storage', err);
  }
}

export function exportAppData(
  tasks: AssignmentTask[],
  contacts: CRMContact[],
  goals: Goal[],
  notes: QuickNote[]
): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tasks,
    contacts,
    goals,
    notes,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `planner_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
