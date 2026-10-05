import { AssignmentTask, CRMContact, Goal, QuickNote } from '../types';

const TASKS_KEY = 'minimal_personal_plans_v1';
const CONTACTS_KEY = 'minimal_personal_contacts_v1';
const GOALS_KEY = 'minimal_personal_goals_v1';
const NOTES_KEY = 'minimal_personal_notes_v1';

// Legacy keys to clean up
const LEGACY_TASKS_KEYS = ['assignment_crm_tasks_v1'];
const LEGACY_CONTACTS_KEYS = ['assignment_crm_contacts_v1'];

// Immediately clean up any residual sample data from previous versions in browser localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    ['minimal_personal_notes_v1_guest', 'minimal_personal_notes_v1'].forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((n: any) => !n.id?.startsWith('note-welcome-'));
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        } catch {}
      }
    });

    ['minimal_personal_goals_v1_guest', 'minimal_personal_goals_v1'].forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((g: any) => g.id !== 'goal-30-days-challenge');
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        } catch {}
      }
    });

    ['minimal_personal_plans_v1_guest', 'minimal_personal_plans_v1'].forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((t: any) => !t.id?.startsWith('task-') && !t.id?.startsWith('mock-') && !t.id?.startsWith('gt-'));
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        } catch {}
      }
    });
  }
} catch {}

function getStorageKey(baseKey: string, userId?: string | null): string {
  if (userId) {
    return `${baseKey}_user_${userId}`;
  }
  return `${baseKey}_guest`;
}

const DEFAULT_SAMPLE_NOTES: QuickNote[] = [];

const DEFAULT_SAMPLE_GOALS: Goal[] = [];

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
            const filtered = parsedLegacy.filter((g: Goal) => g.id !== 'goal-30-days-challenge');
            saveGoalsToStorage(filtered, userId);
            return filtered;
          }
        } catch {}
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((g: Goal) => g.id !== 'goal-30-days-challenge')
        .map((g: Goal) => {
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
    return [];
  } catch (err) {
    console.error('Failed to parse goals from storage', err);
    return [];
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
            const filtered = parsedLegacy.filter((n: QuickNote) => !n.id.startsWith('note-welcome-'));
            saveNotesToStorage(filtered, userId);
            return filtered;
          }
        } catch {}
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((n: QuickNote) => !n.id.startsWith('note-welcome-'));
    }
    return [];
  } catch (err) {
    console.error('Failed to parse notes from storage', err);
    return [];
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
