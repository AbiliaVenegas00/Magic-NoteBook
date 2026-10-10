import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AssignmentTask, 
  CalendarViewMode, 
  FilterOptions, 
  TaskStatus, 
  PriorityLevel, 
  Goal, 
  GoalTask, 
  GoalPriority, 
  QuickNote, 
  MainViewSection 
} from './types';
import { 
  loadTasksFromStorage, 
  saveTasksToStorage, 
  loadGoalsFromStorage, 
  saveGoalsToStorage, 
  loadNotesFromStorage, 
  saveNotesToStorage, 
  clearUserStorage,
  exportAppData 
} from './utils/storage';
import { 
  auth, 
  onAuthStateChanged, 
  User,
  signInWithGoogle,
  signOutUser,
  getGoogleAccessToken,
} from './lib/firebase';
import { 
  subscribeToUserTasks, 
  subscribeToUserGoals, 
  subscribeToUserNotes,
  subscribeToUserMetadata,
  syncTaskToFirestore,
  deleteTaskFromFirestore,
  syncGoalToFirestore,
  deleteGoalFromFirestore,
  syncNoteToFirestore,
  deleteNoteFromFirestore,
  recordDeletedGoogleEvent,
  getDeletedGoogleEvents,
  initializeUserDataIfEmpty
} from './lib/firestoreSync';
import { 
  syncPlansWithGoogleCalendar,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from './lib/googleCalendarSync';
import { isOverdue, isDueToday, formatDateToISO, parseISODate, getTodayDateString } from './utils/dateUtils';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { CalendarDayView } from './components/CalendarDayView';
import { TaskBoardView } from './components/TaskBoardView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { GoalsTrackerView } from './components/GoalsTrackerView';
import { QuickNotesView } from './components/QuickNotesView';
import { LoginCalloutBanner } from './components/LoginCalloutBanner';
import { GoalCompletedCelebrationModal } from './components/GoalCompletedCelebrationModal';
import { fireGoalCompletionConfetti } from './utils/confetti';

/**
 * Automatically identifies and collapses duplicate tasks
 * (same title + due date + due time, e.g. from Google Calendar sync collision).
 */
function deduplicateTasks(tasks: AssignmentTask[]): {
  uniqueTasks: AssignmentTask[];
  duplicatesToDelete: AssignmentTask[];
} {
  const seenIds = new Set<string>();
  const seenFingerprints = new Map<string, AssignmentTask>();
  const uniqueTasks: AssignmentTask[] = [];
  const duplicatesToDelete: AssignmentTask[] = [];

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      duplicatesToDelete.push(task);
      continue;
    }
    seenIds.add(task.id);

    // Normalize fingerprint: title + dueDate + dueTime
    const normTitle = (task.title || '').trim().toLowerCase();
    const fp = `${normTitle}_${task.dueDate}_${task.dueTime || 'all-day'}`;
    const existing = seenFingerprints.get(fp);

    if (existing) {
      // Prioritize the task with higher priority or user-defined priority
      const isUrgent = (t: AssignmentTask) => t.priority === 'urgent_important' || t.priority === 'high';
      const keep = isUrgent(existing) ? existing : (isUrgent(task) ? task : existing);
      const discard = keep === existing ? task : existing;

      // Preserve Google Calendar Event ID on the kept task if the discarded one had it
      if (discard.googleEventId && !keep.googleEventId) {
        keep.googleEventId = discard.googleEventId;
        keep.syncedWithGoogle = true;
      }

      seenFingerprints.set(fp, keep);
      duplicatesToDelete.push(discard);

      const keepIdx = uniqueTasks.findIndex((t) => t.id === discard.id);
      if (keepIdx !== -1) {
        uniqueTasks[keepIdx] = keep;
      }
    } else {
      seenFingerprints.set(fp, task);
      uniqueTasks.push(task);
    }
  }

  return { uniqueTasks, duplicatesToDelete };
}

export default function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Primary persistent state (scoped to authenticated user session)
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>([]);

  // Keep a reference to current tasks for non-reactive async helpers
  const tasksRef = useRef<AssignmentTask[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const isSyncingGCalRef = useRef(false);
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());

  // Main Section navigation: 'calendar' vs 'goals' vs 'notes'
  const [mainSection, setMainSection] = useState<MainViewSection>('calendar');

  // Date and view navigation for calendar
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    contactId: 'all',
    priority: 'all',
    status: 'all',
  });

  // Modal controls
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [celebratedGoal, setCelebratedGoal] = useState<Goal | null>(null);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  const [taskModalDefaults, setTaskModalDefaults] = useState<{
    date?: string;
    time?: string;
    status?: TaskStatus;
    priority?: PriorityLevel;
  }>({});

  // Hidden file input for importing JSON backup
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Pre-load local device cache for this specific user ID for fast offline rendering
        let cachedTasks = loadTasksFromStorage(currentUser.uid);
        const { uniqueTasks: dedupedCache } = deduplicateTasks(cachedTasks);
        cachedTasks = dedupedCache;
        
        // If guest tasks were created on this device before logging in, transfer them to this user
        const guestTasks = loadTasksFromStorage(null);
        if (guestTasks.length > 0) {
          const existingIds = new Set(cachedTasks.map((t) => t.id));
          const newFromGuest = guestTasks.filter((t) => !existingIds.has(t.id));
          if (newFromGuest.length > 0) {
            cachedTasks = [...newFromGuest, ...cachedTasks];
            saveTasksToStorage(cachedTasks, currentUser.uid);
          }
          clearUserStorage(null);
        }

        if (cachedTasks.length > 0) {
          setTasks(cachedTasks);
        }
        setGoals(loadGoalsFromStorage(currentUser.uid));
        setNotes(loadNotesFromStorage(currentUser.uid));

        // Seed initial data to Firestore if user's cloud collection is empty
        initializeUserDataIfEmpty(
          currentUser.uid,
          cachedTasks,
          loadGoalsFromStorage(currentUser.uid),
          loadNotesFromStorage(currentUser.uid)
        ).catch(() => {});
      } else {
        // Logged out: immediately purge private account data from UI
        setTasks([]);
        setGoals(loadGoalsFromStorage(null));
        setNotes(loadNotesFromStorage(null));
        setSelectedTask(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time updates when logged in (Phone & PC stay 100% in sync)
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setGoals(loadGoalsFromStorage(null));
      setNotes(loadNotesFromStorage(null));
      return;
    }

    const unsubMeta = subscribeToUserMetadata(user.uid);

    const unsubTasks = subscribeToUserTasks(user.uid, (cloudTasks) => {
      // Filter out any task that was recently deleted locally
      const validCloudTasks = cloudTasks.filter((t) => !deletedTaskIdsRef.current.has(t.id));

      // Automatically identify and collapse any twin duplicates (e.g., from Google Calendar sync collisions)
      const { uniqueTasks, duplicatesToDelete } = deduplicateTasks(validCloudTasks);

      // Silently clean up orphaned duplicates from Firestore
      if (duplicatesToDelete.length > 0) {
        duplicatesToDelete.forEach((dup) => {
          deleteTaskFromFirestore(user.uid, dup.id).catch(() => {});
        });
      }

      // Sort tasks consistently by dueDate and dueTime
      const sorted = [...uniqueTasks].sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return (a.dueTime || '').localeCompare(b.dueTime || '');
      });
      setTasks(sorted);
      saveTasksToStorage(sorted, user.uid);
    });

    const unsubGoals = subscribeToUserGoals(user.uid, (cloudGoals) => {
      setGoals(cloudGoals);
      saveGoalsToStorage(cloudGoals, user.uid);
    });

    const unsubNotes = subscribeToUserNotes(user.uid, (cloudNotes) => {
      // Pinned notes first, then chronological
      const sorted = [...cloudNotes].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
      });
      setNotes(sorted);
      saveNotesToStorage(sorted, user.uid);
    });

    return () => {
      unsubMeta();
      unsubTasks();
      unsubGoals();
      unsubNotes();
    };
  }, [user?.uid]);

  // Automatic Background Google Calendar Synchronization (Non-looping)
  const runAutoGoogleCalendarSync = async () => {
    if (!user || isSyncingGCalRef.current) return;
    const token = getGoogleAccessToken();
    if (!token) return;

    try {
      isSyncingGCalRef.current = true;
      const deletedEventIds = await getDeletedGoogleEvents(user.uid);
      const { mergedTasks, importedCount } = await syncPlansWithGoogleCalendar(token, tasksRef.current, deletedEventIds);
      if (importedCount > 0) {
        // Only upload newly imported tasks to Firestore (avoid re-saving already synced tasks)
        const newImports = mergedTasks.filter((t) => t.id.startsWith('task-gcal-'));
        for (const t of newImports) {
          await syncTaskToFirestore(user.uid, t);
        }
      }
    } catch (err) {
      console.warn("Auto-sync background check:", err);
    } finally {
      isSyncingGCalRef.current = false;
    }
  };

  // Background auto-sync on focus/visibility and every 60 seconds
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      runAutoGoogleCalendarSync();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const interval = setInterval(() => {
      runAutoGoogleCalendarSync();
    }, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.uid]);

  // Google Sign In handler
  const handleSignInWithGoogle = async () => {
    try {
      const res = await signInWithGoogle();
      if (res.user) {
        setUser(res.user);
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        alert("No se pudo iniciar sesión con Google. Por favor, verifica tu conexión o habilita las ventanas emergentes.");
      }
    }
  };

  // Sign out handler: Cleans out private session from screen and memory
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setTasks([]);
      setGoals(loadGoalsFromStorage(null));
      setNotes(loadNotesFromStorage(null));
      setSelectedTask(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Date navigation handlers
  const handleNavigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(d);
  };

  // Task CRUD operations with DIRECT synchronous Firestore write & Google Calendar push
  const handleSaveTask = async (
    taskData: Omit<AssignmentTask, 'id' | 'createdAt'>,
    taskId?: string
  ) => {
    let savedTask: AssignmentTask;

    if (taskId) {
      const existing = tasksRef.current.find((t) => t.id === taskId);
      savedTask = {
        ...(existing || ({} as AssignmentTask)),
        ...taskData,
        id: taskId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        syncedWithGoogle: true,
      };
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === taskId ? savedTask : t));
        saveTasksToStorage(next, user?.uid);
        return next;
      });
    } else {
      savedTask = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
        syncedWithGoogle: true,
      };
      setTasks((prev) => {
        const next = [savedTask, ...prev];
        saveTasksToStorage(next, user?.uid);
        return next;
      });
    }

    // Persist directly to Firestore synchronously (reflected across PC and mobile in real time)
    deletedTaskIdsRef.current.delete(savedTask.id);
    if (user) {
      await syncTaskToFirestore(user.uid, savedTask);
    }

    // Automatically sync to Google Calendar in background if token exists
    const token = getGoogleAccessToken();
    if (token && savedTask) {
      try {
        if (savedTask.googleEventId) {
          await updateGoogleCalendarEvent(token, savedTask.googleEventId, savedTask);
        } else {
          const created = await createGoogleCalendarEvent(token, savedTask);
          if (created?.id && user) {
            const updatedWithGId = { ...savedTask, googleEventId: created.id, syncedWithGoogle: true };
            setTasks((prev) => {
              const next = prev.map((t) => (t.id === updatedWithGId.id ? updatedWithGId : t));
              saveTasksToStorage(next, user.uid);
              return next;
            });
            await syncTaskToFirestore(user.uid, updatedWithGId);
          }
        }
      } catch (gcalErr) {
        console.warn("Auto Google Calendar push error:", gcalErr);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    deletedTaskIdsRef.current.add(taskId);
    const taskToDelete = tasksRef.current.find((t) => t.id === taskId);

    // Also find any twin duplicate that shares the same title, date, and time
    const twinDuplicates = taskToDelete ? tasksRef.current.filter((t) =>
      t.id !== taskId &&
      (t.title || '').trim().toLowerCase() === (taskToDelete.title || '').trim().toLowerCase() &&
      t.dueDate === taskToDelete.dueDate &&
      (t.dueTime || '') === (taskToDelete.dueTime || '')
    ) : [];

    const allIdsToDelete = [taskId, ...twinDuplicates.map((d) => d.id)];
    allIdsToDelete.forEach((id) => deletedTaskIdsRef.current.add(id));

    setTasks((prev) => {
      const next = prev.filter((t) => !allIdsToDelete.includes(t.id));
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (selectedTask && allIdsToDelete.includes(selectedTask.id)) {
      setSelectedTask(null);
    }

    if (user) {
      for (const id of allIdsToDelete) {
        await deleteTaskFromFirestore(user.uid, id);
      }

      // Record deleted Google events so sync will NEVER resurrect them
      const allGoogleIds = [
        taskToDelete?.googleEventId,
        ...twinDuplicates.map((d) => d.googleEventId),
      ].filter(Boolean) as string[];

      for (const gId of allGoogleIds) {
        await recordDeletedGoogleEvent(user.uid, gId);
      }

      // Automatically remove event from Google Calendar in the background
      const token = getGoogleAccessToken();
      if (token) {
        for (const gId of allGoogleIds) {
          deleteGoogleCalendarEvent(token, gId).catch(() => {});
        }
      }
    }
  };

  const handleDuplicateTask = async (taskToDup: AssignmentTask) => {
    const dup: AssignmentTask = {
      ...taskToDup,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${taskToDup.title} (Copia)`,
      status: 'todo',
      createdAt: new Date().toISOString(),
      googleEventId: undefined,
      syncedWithGoogle: true,
    };
    setTasks((prev) => {
      const next = [dup, ...prev];
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncTaskToFirestore(user.uid, dup);
    }

    const token = getGoogleAccessToken();
    if (token) {
      try {
        const created = await createGoogleCalendarEvent(token, dup);
        if (created?.id && user) {
          const withId = { ...dup, googleEventId: created.id };
          setTasks((prev) => {
            const next = prev.map((t) => (t.id === withId.id ? withId : t));
            saveTasksToStorage(next, user.uid);
            return next;
          });
          await syncTaskToFirestore(user.uid, withId);
        }
      } catch (e) {
        console.warn("Failed to auto-create duplicate in Google Calendar:", e);
      }
    }
  };

  const handleToggleTaskComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = tasksRef.current.find((t) => t.id === taskId);
    if (!target) return;

    const nextStatus: TaskStatus = target.status === 'completed' ? 'todo' : 'completed';
    const updatedTask: AssignmentTask = {
      ...target,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? updatedTask : t));
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncTaskToFirestore(user.uid, updatedTask);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasksRef.current.find((t) => t.id === taskId);
    if (!target) return;

    const updatedTask: AssignmentTask = {
      ...target,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? updatedTask : t));
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncTaskToFirestore(user.uid, updatedTask);
    }
  };

  const handleRescheduleToToday = async (taskId: string) => {
    const today = getTodayDateString();
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return;

    const updated = { ...task, dueDate: today };
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? updated : t));
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncTaskToFirestore(user.uid, updated);
    }
  };

  const handleRescheduleAllToToday = async (taskIds: string[]) => {
    const today = getTodayDateString();
    const idSet = new Set(taskIds);
    setTasks((prev) => {
      const next = prev.map((t) => (idSet.has(t.id) ? { ...t, dueDate: today } : t));
      saveTasksToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      for (const id of taskIds) {
        const t = tasksRef.current.find((x) => x.id === id);
        if (t) {
          await syncTaskToFirestore(user.uid, { ...t, dueDate: today });
        }
      }
    }
  };

  // Filter application
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      // Priority filter
      if (filters.priority !== 'all') {
        const normTaskP = 
          task.priority === 'urgent_important' ? 'high' :
          (task.priority === 'important' || task.priority === 'urgent') ? 'medium' :
          task.priority === 'routine' ? 'low' : task.priority;
        if (normTaskP !== filters.priority && task.priority !== filters.priority) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        if (task.status !== filters.status) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter((t) => t.status !== 'completed').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const dueToday = tasks.filter((t) => isDueToday(t.dueDate) && t.status !== 'completed').length;
    return { total, active, completed, overdue, dueToday };
  }, [tasks]);

  // Modal open helpers with prefilled state
  const openCreateTask = (defaults: {
    date?: string;
    time?: string;
    status?: TaskStatus;
    priority?: PriorityLevel;
  } = {}) => {
    setSelectedTask(null);
    setTaskModalDefaults(defaults);
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: AssignmentTask) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  // Goals handlers with DIRECT synchronous Firestore write
  const handleAddGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'tasks'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      tasks: [],
    };
    setGoals((prev) => {
      const next = [newGoal, ...prev];
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, newGoal);
    }
  };

  const handleUpdateGoal = async (goalId: string, updated: Partial<Goal>) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const updatedGoal: Goal = { ...target, ...updated };
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleTogglePinGoal = async (goalId: string, isPinned?: boolean) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const nextPinned = isPinned !== undefined ? isPinned : !target.isPinned;
    const updatedGoal: Goal = { ...target, isPinned: nextPinned };

    setGoals((prev) => {
      const remaining = prev.filter((g) => g.id !== goalId);
      let next: Goal[];
      if (nextPinned) {
        const firstUnpinned = remaining.findIndex((g) => !g.isPinned);
        if (firstUnpinned === -1) {
          next = [...remaining, updatedGoal];
        } else {
          next = [
            ...remaining.slice(0, firstUnpinned),
            updatedGoal,
            ...remaining.slice(firstUnpinned),
          ];
        }
      } else {
        const firstUnpinned = remaining.findIndex((g) => !g.isPinned);
        if (firstUnpinned === -1) {
          next = [...remaining, updatedGoal];
        } else {
          next = [
            ...remaining.slice(0, firstUnpinned),
            updatedGoal,
            ...remaining.slice(firstUnpinned),
          ];
        }
      }
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== goalId);
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await deleteGoalFromFirestore(user.uid, goalId);
    }
  };

  const handleToggleGoalTask = async (goalId: string, taskId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    // Check if toggling this task turns it from pending -> completed
    const existingTask = target.tasks.find((t) => t.id === taskId);
    const willBeCompleted = existingTask ? !existingTask.completed : false;

    const updatedTasks = target.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const completed = !t.completed;
      return {
        ...t,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
    });

    const updatedGoal: Goal = {
      ...target,
      tasks: updatedTasks,
    };

    // Check if before this action, the goal was NOT fully completed,
    // and NOW with this toggle, every single task in the goal is completed
    const totalTasks = updatedTasks.length;
    const wasCompletedBefore = target.tasks.length > 0 && target.tasks.every((t) => t.completed);
    const isNowAllCompleted = totalTasks > 0 && updatedTasks.every((t) => t.completed);

    if (willBeCompleted && !wasCompletedBefore && isNowAllCompleted) {
      // Trigger celebration sound & confetti
      fireGoalCompletionConfetti();
      setCelebratedGoal(updatedGoal);
    }

    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleAddGoalTask = async (
    goalId: string, 
    taskTitle: string, 
    priority: PriorityLevel = 'important',
    isPinned: boolean = false
  ) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const newTask: GoalTask = {
      id: `gt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: taskTitle.trim(),
      completed: false,
      priority,
      isPinned,
    };

    let updatedTasks: GoalTask[];
    if (isPinned) {
      const firstUnpinnedIndex = target.tasks.findIndex((t) => !t.isPinned);
      if (firstUnpinnedIndex === -1) {
        updatedTasks = [...target.tasks, newTask];
      } else {
        updatedTasks = [
          ...target.tasks.slice(0, firstUnpinnedIndex),
          newTask,
          ...target.tasks.slice(firstUnpinnedIndex),
        ];
      }
    } else {
      updatedTasks = [...target.tasks, newTask];
    }

    const updatedGoal: Goal = {
      ...target,
      tasks: updatedTasks,
    };
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleTogglePinGoalTask = async (goalId: string, taskId: string, isPinned?: boolean) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const task = target.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextPinned = isPinned !== undefined ? isPinned : !task.isPinned;
    const updatedTask: GoalTask = { ...task, isPinned: nextPinned };

    const remainingTasks = target.tasks.filter((t) => t.id !== taskId);
    let updatedTasks: GoalTask[];

    if (nextPinned) {
      // Move to top among pinned tasks
      const firstUnpinnedIndex = remainingTasks.findIndex((t) => !t.isPinned);
      if (firstUnpinnedIndex === -1) {
        updatedTasks = [...remainingTasks, updatedTask];
      } else {
        updatedTasks = [
          ...remainingTasks.slice(0, firstUnpinnedIndex),
          updatedTask,
          ...remainingTasks.slice(firstUnpinnedIndex),
        ];
      }
    } else {
      // Unpinned: place at the start of unpinned tasks
      const firstUnpinnedIndex = remainingTasks.findIndex((t) => !t.isPinned);
      if (firstUnpinnedIndex === -1) {
        updatedTasks = [...remainingTasks, updatedTask];
      } else {
        updatedTasks = [
          ...remainingTasks.slice(0, firstUnpinnedIndex),
          updatedTask,
          ...remainingTasks.slice(firstUnpinnedIndex),
        ];
      }
    }

    const updatedGoal: Goal = {
      ...target,
      tasks: updatedTasks,
    };

    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleUpdateGoalTaskPriority = async (goalId: string, taskId: string, priority: PriorityLevel | GoalPriority) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const updatedGoal: Goal = {
      ...target,
      tasks: target.tasks.map((t) => (t.id === taskId ? { ...t, priority } : t)),
    };
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleReorderGoalTasks = async (goalId: string, reorderedTasks: GoalTask[]) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const updatedGoal: Goal = { ...target, tasks: reorderedTasks };
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  const handleDeleteGoalTask = async (goalId: string, taskId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;

    const updatedGoal: Goal = {
      ...target,
      tasks: target.tasks.filter((t) => t.id !== taskId),
    };
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === goalId ? updatedGoal : g));
      saveGoalsToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncGoalToFirestore(user.uid, updatedGoal);
    }
  };

  // Quick Notes handlers with DIRECT synchronous Firestore write
  const handleAddNote = async (noteData: Omit<QuickNote, 'id' | 'createdAt'>) => {
    const newNote: QuickNote = {
      ...noteData,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => {
      const next = [newNote, ...prev];
      saveNotesToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncNoteToFirestore(user.uid, newNote);
    }
  };

  const handleUpdateNote = async (noteId: string, updated: Partial<QuickNote>) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    const updatedNote: QuickNote = { ...target, ...updated, updatedAt: new Date().toISOString() };
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === noteId ? updatedNote : n));
      saveNotesToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await syncNoteToFirestore(user.uid, updatedNote);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== noteId);
      saveNotesToStorage(next, user?.uid);
      return next;
    });

    if (user) {
      await deleteNoteFromFirestore(user.uid, noteId);
    }
  };

  // Export / Import / Clear handlers
  const handleExport = () => {
    exportAppData(tasks, [], goals, notes);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.tasks && Array.isArray(json.tasks)) {
          setTasks(json.tasks);
          if (user) {
            for (const t of json.tasks) {
              await syncTaskToFirestore(user.uid, t);
            }
          }
        }
        if (json.goals && Array.isArray(json.goals)) {
          setGoals(json.goals);
          if (user) {
            for (const g of json.goals) {
              await syncGoalToFirestore(user.uid, g);
            }
          }
        }
        if (json.notes && Array.isArray(json.notes)) {
          setNotes(json.notes);
          if (user) {
            for (const n of json.notes) {
              await syncNoteToFirestore(user.uid, n);
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse import JSON', err);
        alert('El archivo no es un JSON válido para restaurar.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllData = async () => {
    const currentTasks = [...tasks];
    const currentGoals = [...goals];
    const currentNotes = [...notes];

    setTasks([]);
    setGoals([]);
    setNotes([]);

    if (user) {
      for (const t of currentTasks) {
        await deleteTaskFromFirestore(user.uid, t.id);
      }
      for (const g of currentGoals) {
        await deleteGoalFromFirestore(user.uid, g.id);
      }
      for (const n of currentNotes) {
        await deleteNoteFromFirestore(user.uid, n.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1F1F1F] text-white flex flex-col font-sans selection:bg-[#FFD1DB] selection:text-[#1F1F1F] relative overflow-x-hidden">
      {/* Background ambient lighting matching the #1F1F1F & #5C464B palette */}
      <div className="pointer-events-none fixed -top-48 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#5C464B]/20 via-[#C18C98]/10 to-transparent blur-3xl z-0" aria-hidden="true" />
      <div className="pointer-events-none fixed top-1/3 -left-32 w-[600px] h-[500px] bg-gradient-to-tr from-[#5C464B]/15 via-[#FF688B]/5 to-transparent blur-3xl z-0" aria-hidden="true" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-[#5C464B]/20 via-[#C18C98]/10 to-transparent blur-3xl z-0" aria-hidden="true" />

      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Main Top Header */}
      <div className="relative z-20">
        <Header
          currentDate={currentDate}
          onNavigateDate={handleNavigateDate}
          viewMode={viewMode}
          onChangeViewMode={(mode) => setViewMode(mode)}
          mainSection={mainSection}
          onChangeMainSection={(section) => setMainSection(section)}
          onOpenCreateTask={() => openCreateTask()}
          onOpenCreateGoal={() => setIsCreateGoalModalOpen(true)}
          onExportData={handleExport}
          onImportData={handleImportClick}
          onClearAllData={handleClearAllData}
          user={user}
          authLoading={authLoading}
          onSignInWithGoogle={handleSignInWithGoogle}
          onSignOut={handleSignOut}
        />

        {/* Filter Bar */}
        {mainSection === 'calendar' && (
          <FilterBar
            filters={filters}
            onChangeFilters={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
            onResetFilters={() =>
              setFilters({
                search: '',
                contactId: 'all',
                priority: 'all',
                status: 'all',
              })
            }
            stats={stats}
          />
        )}
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Sign in with Google Callout Banner when user is guest */}
        {!user && !authLoading && (
          <LoginCalloutBanner onSignInWithGoogle={handleSignInWithGoogle} />
        )}

        {mainSection === 'goals' ? (
          <GoalsTrackerView
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onTogglePinGoal={handleTogglePinGoal}
            onToggleGoalTask={handleToggleGoalTask}
            onAddGoalTask={handleAddGoalTask}
            onDeleteGoalTask={handleDeleteGoalTask}
            onUpdateGoalTaskPriority={handleUpdateGoalTaskPriority}
            onTogglePinGoalTask={handleTogglePinGoalTask}
            onReorderGoalTasks={handleReorderGoalTasks}
            isCreateGoalModalOpen={isCreateGoalModalOpen}
            onOpenCreateGoalModal={() => setIsCreateGoalModalOpen(true)}
            onCloseCreateGoalModal={() => setIsCreateGoalModalOpen(false)}
          />
        ) : mainSection === 'notes' ? (
          <QuickNotesView
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        ) : (
          <>
            {viewMode === 'month' && (
              <CalendarMonthView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={openEditTask}
                onToggleTaskComplete={handleToggleTaskComplete}
                onSelectDay={(dateStr) => {
                  setCurrentDate(parseISODate(dateStr));
                  setViewMode('day');
                }}
                onCreateTaskForDay={(dateStr) => {
                  openCreateTask({ date: dateStr });
                }}
                onRescheduleAllToToday={handleRescheduleAllToToday}
                onSwitchToBoard={() => setViewMode('board')}
                onNavigateDate={handleNavigateDate}
              />
            )}

            {viewMode === 'week' && (
              <CalendarWeekView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={openEditTask}
                onToggleTaskComplete={handleToggleTaskComplete}
                onCreateTaskForDayAndTime={(dateStr, timeStr) => {
                  openCreateTask({ date: dateStr, time: timeStr });
                }}
              />
            )}

            {viewMode === 'day' && (
              <CalendarDayView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={openEditTask}
                onToggleTaskComplete={handleToggleTaskComplete}
                onOpenCreateTask={() => {
                  openCreateTask({ date: formatDateToISO(currentDate) });
                }}
              />
            )}

            {viewMode === 'board' && (
              <TaskBoardView
                tasks={filteredTasks}
                onSelectTask={openEditTask}
                onToggleTaskComplete={handleToggleTaskComplete}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onCreateTaskWithStatus={(status) => {
                  openCreateTask({ status });
                }}
                currentDate={currentDate}
                onDeleteTask={handleDeleteTask}
                onNavigateToTaskDate={(dateStr) => {
                  setCurrentDate(parseISODate(dateStr));
                  setViewMode('month');
                }}
                onRescheduleToToday={handleRescheduleToToday}
              />
            )}
          </>
        )}
      </main>

      {/* Task Creation / Edit Modal */}
      <TaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        initialDate={taskModalDefaults.date}
        initialTime={taskModalDefaults.time}
        initialStatus={taskModalDefaults.status}
        initialPriority={taskModalDefaults.priority}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onDuplicateTask={handleDuplicateTask}
      />

      {/* Goal Completed Celebration Modal */}
      <GoalCompletedCelebrationModal
        isOpen={!!celebratedGoal}
        goalTitle={celebratedGoal?.title || ''}
        onClose={() => setCelebratedGoal(null)}
      />
    </div>
  );
}
