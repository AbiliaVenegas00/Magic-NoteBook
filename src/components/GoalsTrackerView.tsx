import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  X,
  ListPlus,
  Clock,
  GripVertical,
  Pencil,
  Pin,
  Sparkles,
  Trophy
} from 'lucide-react';
import { Goal, GoalTask, PriorityLevel, GoalPriority } from '../types';

export type CleanPriority = 'high' | 'medium' | 'low';

export interface PriorityInfo {
  key: CleanPriority;
  label: string;
  colorHex: string;
  dotClass: string;
  borderClass: string;
  badgeClass: string;
  order: number;
}

export const CLEAN_PRIORITIES: PriorityInfo[] = [
  {
    key: 'high',
    label: 'Alta',
    colorHex: '#EF4444', // Rojo
    dotClass: 'bg-rose-500',
    borderClass: 'border-l-rose-500',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
    order: 1,
  },
  {
    key: 'medium',
    label: 'Media',
    colorHex: '#EAB308', // Amarillo
    dotClass: 'bg-amber-400',
    borderClass: 'border-l-amber-400',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30',
    order: 2,
  },
  {
    key: 'low',
    label: 'Baja',
    colorHex: '#10B981', // Verde
    dotClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
    order: 3,
  },
];

export function normalizePriority(p?: PriorityLevel | GoalPriority): CleanPriority {
  if (!p) return 'medium';
  if (p === 'high' || p === 'urgent_important') return 'high';
  if (p === 'low' || p === 'routine') return 'low';
  return 'medium';
}

function getNextPriority(current: CleanPriority): CleanPriority {
  if (current === 'high') return 'medium';
  if (current === 'medium') return 'low';
  return 'high';
}

interface GoalsTrackerViewProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (goalId: string, updated: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onTogglePinGoal?: (goalId: string, isPinned?: boolean) => void;
  onToggleGoalTask: (goalId: string, taskId: string) => void;
  onAddGoalTask: (goalId: string, taskTitle: string, priority?: PriorityLevel | GoalPriority, isPinned?: boolean) => void;
  onDeleteGoalTask: (goalId: string, taskId: string) => void;
  onUpdateGoalTaskPriority: (goalId: string, taskId: string, priority: PriorityLevel | GoalPriority) => void;
  onTogglePinGoalTask?: (goalId: string, taskId: string, isPinned?: boolean) => void;
  onReorderGoalTasks?: (goalId: string, reorderedTasks: GoalTask[]) => void;
  isCreateGoalModalOpen?: boolean;
  onOpenCreateGoalModal?: () => void;
  onCloseCreateGoalModal?: () => void;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function calculateTimeRemaining(goal: Goal, isFinished: boolean) {
  if (isFinished) {
    return {
      daysLeft: 0,
      totalDays: goal.targetDays || 30,
      label: 'Meta cumplida',
      urgency: 'completed' as const,
      percentRemaining: 100,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let targetTimestamp: number;
  const totalDays = goal.targetDays || 30;

  if (goal.targetDate) {
    const [y, m, d] = goal.targetDate.split('-').map(Number);
    targetTimestamp = new Date(y, m - 1, d).getTime();
  } else if (goal.createdAt && goal.targetDays) {
    const created = new Date(goal.createdAt);
    const createdStart = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
    targetTimestamp = createdStart + goal.targetDays * 24 * 60 * 60 * 1000;
  } else {
    targetTimestamp = todayStart + totalDays * 24 * 60 * 60 * 1000;
  }

  const diffMs = targetTimestamp - todayStart;
  const daysLeft = Math.round(diffMs / (24 * 60 * 60 * 1000));

  let label = '';
  let urgency: 'normal' | 'soon' | 'overdue' = 'normal';

  if (daysLeft < 0) {
    const abs = Math.abs(daysLeft);
    label = abs === 1 ? 'Venció ayer' : `Venció hace ${abs} días`;
    urgency = 'overdue';
  } else if (daysLeft === 0) {
    label = 'Termina hoy';
    urgency = 'soon';
  } else if (daysLeft === 1) {
    label = 'Queda 1 día';
    urgency = 'soon';
  } else {
    label = `Quedan ${daysLeft} días`;
    urgency = daysLeft <= 5 ? 'soon' : 'normal';
  }

  const percentRemaining = totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100))) : 0;

  return {
    daysLeft,
    totalDays,
    label,
    urgency,
    percentRemaining,
  };
}

export const GoalsTrackerView: React.FC<GoalsTrackerViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onTogglePinGoal,
  onToggleGoalTask,
  onAddGoalTask,
  onDeleteGoalTask,
  onUpdateGoalTaskPriority,
  onTogglePinGoalTask,
  onReorderGoalTasks,
  isCreateGoalModalOpen = false,
  onOpenCreateGoalModal,
  onCloseCreateGoalModal,
}) => {
  const [localCreateModalOpen, setLocalCreateModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [newGoalTargetCount, setNewGoalTargetCount] = useState<number>(20);
  const [newGoalColor, setNewGoalColor] = useState('#FF99AA');
  const [newGoalIsPinned, setNewGoalIsPinned] = useState(false);

  // Inline input state per goal: map goalId -> input text
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  // Selected priority per goal for newly added task: map goalId -> CleanPriority
  const [taskPriorities, setTaskPriorities] = useState<Record<string, CleanPriority>>({});
  // Map goalId -> boolean for pin state of inline new task
  const [taskIsPinned, setTaskIsPinned] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null);

  // Bulk add modal per goal
  const [bulkAddGoalId, setBulkAddGoalId] = useState<string | null>(null);
  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkAddPriority, setBulkAddPriority] = useState<CleanPriority>('high');
  const [bulkAddIsPinned, setBulkAddIsPinned] = useState(false);

  // Filter for tasks: 'all' | 'pending' | 'completed'
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Confirmation modal to reliably delete goal without blocked window.confirm
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Edit Goal modal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalDate, setEditGoalDate] = useState('');
  const [editGoalTargetCount, setEditGoalTargetCount] = useState<number>(20);
  const [editGoalColor, setEditGoalColor] = useState('#FF99AA');
  const [editGoalIsPinned, setEditGoalIsPinned] = useState(false);

  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalTitle(goal.title);
    setEditGoalDate(goal.targetDate || '');
    setEditGoalTargetCount(goal.targetCount || 20);
    setEditGoalColor(goal.color || '#FF99AA');
    setEditGoalIsPinned(!!goal.isPinned);
  };

  const handleSaveEditGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editGoalTitle.trim()) return;

    let calculatedDays = editingGoal.targetDays;
    if (editGoalDate) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const [y, m, d] = editGoalDate.split('-').map(Number);
      const targetTimestamp = new Date(y, m - 1, d).getTime();
      calculatedDays = Math.max(1, Math.round((targetTimestamp - todayStart) / (24 * 60 * 60 * 1000)));
    }

    onUpdateGoal(editingGoal.id, {
      title: editGoalTitle.trim(),
      targetDate: editGoalDate || undefined,
      targetDays: calculatedDays,
      targetCount: editGoalTargetCount > 0 ? editGoalTargetCount : undefined,
      color: editGoalColor,
      isPinned: editGoalIsPinned,
    });

    setEditingGoal(null);
  };

  const showCreateModal = isCreateGoalModalOpen || localCreateModalOpen;

  const handleOpenModal = () => {
    if (onOpenCreateGoalModal) {
      onOpenCreateGoalModal();
    } else {
      setLocalCreateModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    if (onCloseCreateGoalModal) {
      onCloseCreateGoalModal();
    }
    setLocalCreateModalOpen(false);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const defaultDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    };

    const targetDate = newGoalDate || defaultDate();

    // Calculate days between today and the targetDate
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const [y, m, d] = targetDate.split('-').map(Number);
    const targetTimestamp = new Date(y, m - 1, d).getTime();
    const calculatedDays = Math.max(1, Math.round((targetTimestamp - todayStart) / (24 * 60 * 60 * 1000)));

    onAddGoal({
      title: newGoalTitle.trim(),
      targetDays: calculatedDays,
      targetDate,
      targetCount: newGoalTargetCount > 0 ? newGoalTargetCount : undefined,
      color: newGoalColor,
      tasks: [],
      isPinned: newGoalIsPinned,
    });

    setNewGoalTitle('');
    setNewGoalDate(defaultDate());
    setNewGoalTargetCount(20);
    setNewGoalIsPinned(false);
    handleCloseModal();
  };

  const handleInlineAddTask = (goalId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = taskInputs[goalId]?.trim();
    if (!text) return;

    const priority = taskPriorities[goalId] || 'high';
    const isPinned = !!taskIsPinned[goalId];
    onAddGoalTask(goalId, text, priority, isPinned);
    setTaskInputs((prev) => ({ ...prev, [goalId]: '' }));
    setTaskIsPinned((prev) => ({ ...prev, [goalId]: false }));
  };

  const handleBulkAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAddGoalId || !bulkAddText.trim()) return;

    const lines = bulkAddText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      const cleaned = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, '').trim();
      if (cleaned) {
        onAddGoalTask(bulkAddGoalId, cleaned, bulkAddPriority, bulkAddIsPinned);
      }
    }

    setBulkAddGoalId(null);
    setBulkAddText('');
    setBulkAddIsPinned(false);
  };

  // Drag and Drop handlers to reorganize tasks up or down
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverTaskId !== taskId) {
      setDraggedOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent, goal: Goal, targetTaskId: string) => {
    e.preventDefault();
    const sourceTaskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);
    setDraggedOverTaskId(null);

    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const currentTasks = [...goal.tasks];
    const sourceIndex = currentTasks.findIndex((t) => t.id === sourceTaskId);
    const targetIndex = currentTasks.findIndex((t) => t.id === targetTaskId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Move source task to target index
    const [movedTask] = currentTasks.splice(sourceIndex, 1);
    const targetTask = currentTasks[targetIndex];
    if (targetTask) {
      // Keep pin status consistent with the drop target
      movedTask.isPinned = targetTask.isPinned;
    }
    currentTasks.splice(targetIndex, 0, movedTask);

    if (onReorderGoalTasks) {
      onReorderGoalTasks(goal.id, currentTasks);
    }
  };

  // Sort tasks in goal by color hierarchy, keeping pinned tasks on top
  const handleSortByColor = (goal: Goal) => {
    const currentTasks = [...goal.tasks];
    currentTasks.sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      const pA = normalizePriority(a.priority);
      const pB = normalizePriority(b.priority);
      const orderA = CLEAN_PRIORITIES.find((p) => p.key === pA)?.order ?? 2;
      const orderB = CLEAN_PRIORITIES.find((p) => p.key === pB)?.order ?? 2;
      return orderA - orderB;
    });

    if (onReorderGoalTasks) {
      onReorderGoalTasks(goal.id, currentTasks);
    }
  };

  const pinnedGoals = useMemo(() => goals.filter((g) => g.isPinned), [goals]);
  const otherGoals = useMemo(() => goals.filter((g) => !g.isPinned), [goals]);
  const orderedGoals = useMemo(() => [...pinnedGoals, ...otherGoals], [pinnedGoals, otherGoals]);

  return (
    <div className="space-y-5" id="goals-tracker-view">
      
      {/* Top Banner / Summary Card */}
      <div className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#3D2C30] border border-[#5C464B] text-[#FFD1DB] shadow-xs shrink-0">
              <Target className="w-4 h-4 stroke-[2.5]" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Tareas por Meta
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter pills */}
            <div className="flex items-center p-0.5 bg-[#3D2C30] border border-[#5C464B] rounded-full text-xs">
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-3 py-1 rounded-full font-bold transition-all text-xs ${
                  taskFilter === 'all'
                    ? 'bg-[#FF688B] text-white shadow-xs'
                    : 'text-[#FFD1DB]/70 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setTaskFilter('pending')}
                className={`px-3 py-1 rounded-full font-bold transition-all text-xs ${
                  taskFilter === 'pending'
                    ? 'bg-[#FF688B] text-white shadow-xs'
                    : 'text-[#FFD1DB]/70 hover:text-white'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`px-3 py-1 rounded-full font-bold transition-all text-xs ${
                  taskFilter === 'completed'
                    ? 'bg-[#FF688B] text-white shadow-xs'
                    : 'text-[#FFD1DB]/70 hover:text-white'
                }`}
              >
                Cumplidas
              </button>
            </div>


            <button
              onClick={handleOpenModal}
              id="btn-new-goal-action"
              className="px-4 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nueva Meta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Goals Cards Grid / List */}
      {goals.length === 0 ? (
        <div className="relative bg-[#252525] border border-[#5C464B]/50 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#3D2C30] border border-[#5C464B] flex items-center justify-center mb-3 text-[#FFD1DB]">
            <Target className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No hay metas activas</h3>
          <p className="text-xs text-white/50 mb-4">
            Crea una meta para organizar y registrar tus tareas pendientes.
          </p>
          <button
            onClick={handleOpenModal}
            className="px-5 py-2 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nueva Meta</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orderedGoals.map((goal, goalIndex) => {
            const isFirstPinned = goalIndex === 0 && !!goal.isPinned;
            const isFirstOther = goalIndex === pinnedGoals.length && pinnedGoals.length > 0;
            const totalTasks = goal.tasks.length;
            const completedTasks = goal.tasks.filter((t) => t.completed).length;
            
            const isFinished = totalTasks > 0 && completedTasks === totalTasks && (!goal.targetCount || completedTasks >= goal.targetCount);
            const timeInfo = calculateTimeRemaining(goal, isFinished);

            const targetTotal = goal.targetCount && goal.targetCount > 0 
              ? goal.targetCount 
              : (totalTasks > 0 ? totalTasks : 1);
            const progressPercent = isFinished 
              ? 100 
              : (totalTasks === 0 ? 0 : Math.min(100, Math.round((completedTasks / targetTotal) * 100)));

            // Filter tasks based on view filter
            const visibleTasks = goal.tasks.filter((t) => {
              if (taskFilter === 'pending') return !t.completed;
              if (taskFilter === 'completed') return t.completed;
              return true;
            });

            const currentInputPriority = taskPriorities[goal.id] || 'high';

            return (
              <React.Fragment key={goal.id}>
                {isFirstPinned && (
                  <div className="col-span-full flex items-center gap-2 pt-1 pb-0.5 text-[11px] font-extrabold text-[#FF99AA] uppercase tracking-wider px-1">
                    <Pin className="w-3.5 h-3.5 fill-[#FF99AA] text-[#FF99AA]" />
                    <span>Listas de Tareas Fijadas ({pinnedGoals.length})</span>
                  </div>
                )}
                {isFirstOther && (
                  <div className="col-span-full flex items-center gap-2 pt-4 pb-0.5 text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">
                    <span>Otras Metas ({otherGoals.length})</span>
                  </div>
                )}
                <div
                  className={`relative bg-[#252525] border rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between transition-all duration-200 hover:border-[#FF688B]/60 overflow-hidden ${
                  goal.isPinned
                    ? 'border-[#FF688B]/70 ring-1 ring-[#FF688B]/30 shadow-[0_0_24px_rgba(255,104,139,0.18)]'
                    : 'border-[#5C464B]/50'
                }`}
              >
                <div className="relative z-10">
                  {/* Goal Header */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: goal.color || '#FF688B' }}
                      />
                      <h3 className="text-sm font-extrabold text-white truncate tracking-tight">
                        {goal.title}
                      </h3>
                      {goal.isPinned && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF688B]/20 text-[#FF4D79] border border-[#FF688B]/40 shrink-0 shadow-xs"
                          title="Lista de tareas fijada arriba"
                        >
                          <Pin className="w-2.5 h-2.5 fill-[#FF4D79]" />
                          <span>Fijada</span>
                        </span>
                      )}
                      {isFinished && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Completada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Pin entire goal list button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onTogglePinGoal) {
                            onTogglePinGoal(goal.id, !goal.isPinned);
                          } else {
                            onUpdateGoal(goal.id, { isPinned: !goal.isPinned });
                          }
                        }}
                        className={`px-2 py-1 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold ${
                          goal.isPinned
                            ? 'text-[#FF2E63] bg-[#FF688B]/20 hover:bg-[#FF688B]/35 border border-[#FF688B]/40 shadow-xs'
                            : 'text-[#FFD1DB]/75 hover:text-white hover:bg-white/10'
                        }`}
                        title={goal.isPinned ? 'Desfijar lista de tareas' : 'Fijar lista de tareas arriba'}
                        aria-label={goal.isPinned ? 'Desfijar lista de tareas' : 'Fijar lista de tareas arriba'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${goal.isPinned ? 'fill-[#FF2E63] text-[#FF2E63]' : 'text-[#FF688B]'}`} />
                        <span>{goal.isPinned ? 'Fijada' : 'Fijar'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditGoal(goal)}
                        className="px-2 py-1 rounded-xl text-[#FFD1DB]/75 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-xs font-semibold"
                        title="Editar meta"
                      >
                        <Pencil className="w-3 h-3 text-[#FF688B]" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          setBulkAddGoalId(goal.id);
                          setBulkAddText('');
                          setBulkAddPriority('high');
                        }}
                        className="p-1.5 rounded-xl text-[#FFD1DB]/60 hover:text-white hover:bg-white/10 transition-all"
                        title="Pegar varias tareas"
                      >
                        <ListPlus className="w-3.5 h-3.5 text-[#FFD1DB]" />
                      </button>

                      <button
                        onClick={() => setGoalToDelete(goal)}
                        className="p-1.5 rounded-xl text-white/40 hover:text-[#FF688B] hover:bg-[#FF688B]/15 transition-all"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Clean Counter & Time Box */}
                  <div className="p-2.5 bg-[#1F1F1F] border border-[#5C464B]/40 rounded-2xl mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#FFD1DB] font-mono font-bold">
                          {completedTasks} de {goal.targetCount ? goal.targetCount : totalTasks} cumplidas
                        </span>
                      </div>

                      {/* Remaining Time Badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isFinished
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : timeInfo.urgency === 'overdue'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : timeInfo.urgency === 'soon'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-[#3D2C30] text-[#FFD1DB] border border-[#5C464B]'
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-[#FF688B]" />
                        <span>{timeInfo.label}</span>
                      </div>
                    </div>

                    {/* Task Completion Progress Bar with Vibrant Neon Glow */}
                    <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden mb-1.5 p-[1px] border border-[#5C464B]/50 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out relative ${
                          isFinished
                            ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.95),0_0_22px_rgba(52,211,153,0.55)]'
                            : 'bg-gradient-to-r from-[#FF2E63] via-[#FF688B] to-[#FFA8BC] shadow-[0_0_12px_rgba(255,104,139,0.95),0_0_22px_rgba(255,104,139,0.6)]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      >
                        {progressPercent > 0 && (
                          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" />
                        )}
                      </div>
                    </div>

                    {/* Completion celebratory mini-banner */}
                    {isFinished && (
                      <div className="mt-2 mb-1 p-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-1.5 font-black">
                          <Trophy className="w-4 h-4 text-emerald-400 fill-emerald-500/30" />
                          <span>¡Completaste toda la meta! 🎉</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400/90 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>100%</span>
                        </span>
                      </div>
                    )}

                    {/* Clean Date Limit Footer */}
                    {goal.targetDate && (
                      <div className="flex items-center justify-end text-[11px] text-[#E5A0B6] font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#FF688B]" />
                          <span>Hasta: {formatShortDate(goal.targetDate)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Priority Color Legend (Clean, no P1..P4 text, no arrastra text) */}
                  <div className="flex items-center justify-end text-[11px] px-1 mb-2">
                    <div className="flex items-center gap-2.5 text-[10px] font-bold">
                      <span className="text-rose-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" /> Alta
                      </span>
                      <span className="text-amber-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50" /> Media
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" /> Baja
                      </span>
                    </div>
                  </div>

                  {/* Inline Add Task Input with 3 Color Selectors and Pin Toggle */}
                  <form onSubmit={(e) => handleInlineAddTask(goal.id, e)} className="flex items-center gap-1.5 mb-3">
                    {/* 3 Color Priority Picker (No P1, P2, P3, P4 text) */}
                    <div className="flex items-center gap-1 p-1 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl shrink-0">
                      {CLEAN_PRIORITIES.map((p) => {
                        const isSelected = currentInputPriority === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setTaskPriorities((prev) => ({ ...prev, [goal.id]: p.key }))}
                            className={`w-4 h-4 rounded-full transition-all duration-150 ${p.dotClass} ${
                              isSelected
                                ? 'scale-125 ring-2 ring-white shadow-md'
                                : 'opacity-40 hover:opacity-100 hover:scale-110'
                            }`}
                            title={`Prioridad ${p.label}`}
                            aria-label={`Prioridad ${p.label}`}
                          />
                        );
                      })}
                    </div>

                    {/* Pin button for new task */}
                    <button
                      type="button"
                      onClick={() => setTaskIsPinned((prev) => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                      className={`p-1.5 rounded-xl border transition-all shrink-0 flex items-center justify-center ${
                        taskIsPinned[goal.id]
                          ? 'bg-[#FF688B]/25 border-[#FF688B] text-[#FF688B] ring-1 ring-[#FF688B]/50 shadow-xs'
                          : 'bg-[#1F1F1F] border-[#5C464B]/50 text-white/40 hover:text-white hover:border-white/30'
                      }`}
                      title={taskIsPinned[goal.id] ? 'La tarea se creará fijada arriba (activado)' : 'Fijar tarea arriba al crear'}
                      aria-label="Fijar tarea arriba"
                    >
                      <Pin className={`w-3.5 h-3.5 ${taskIsPinned[goal.id] ? 'fill-[#FF688B]' : ''}`} />
                    </button>

                    <input
                      type="text"
                      value={taskInputs[goal.id] || ''}
                      onChange={(e) => setTaskInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder={taskIsPinned[goal.id] ? "Escribe una tarea para fijar arriba..." : "Escribe una tarea y presiona Enter..."}
                      className="flex-1 px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#222222] focus:bg-[#222222] border border-[#5C464B]/50 rounded-xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B] transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!taskInputs[goal.id]?.trim()}
                      className="px-3.5 py-1.5 text-xs font-extrabold bg-[#FFD1DB] hover:bg-white text-[#1F1F1F] disabled:opacity-30 disabled:pointer-events-none rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
                    >
                      + Añadir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkAddGoalId(goal.id);
                        setBulkAddText('');
                        setBulkAddPriority(currentInputPriority);
                        setBulkAddIsPinned(!!taskIsPinned[goal.id]);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-[#3D2C30] hover:bg-[#4E393E] text-[#FFD1DB] border border-[#5C464B] rounded-xl transition-all shrink-0"
                      title="Pegar varias tareas de una sola vez"
                    >
                      Varias
                    </button>
                  </form>

                  {/* Task List with Pinned Section, Drag & Drop Reordering */}
                  <div className="space-y-2">
                    {visibleTasks.length === 0 ? (
                      <div className="py-5 text-center border border-dashed border-[#5C464B]/40 rounded-xl text-xs text-white/40">
                        {goal.tasks.length === 0 ? 'Sin tareas. Añade una arriba.' : 'No hay tareas en este filtro.'}
                      </div>
                    ) : (
                      <>
                        {/* Pinned Tasks */}
                        {visibleTasks.filter((t) => t.isPinned).length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#FF99AA] uppercase tracking-wider px-1 pt-0.5">
                              <Pin className="w-3 h-3 fill-[#FF99AA] text-[#FF99AA]" />
                              <span>Tareas fijadas ({visibleTasks.filter((t) => t.isPinned).length})</span>
                            </div>
                            {visibleTasks
                              .filter((t) => t.isPinned)
                              .map((task, pIdx) => {
                                const priorityKey = normalizePriority(task.priority);
                                const pConfig = CLEAN_PRIORITIES.find((p) => p.key === priorityKey) || CLEAN_PRIORITIES[0];
                                const isDragging = draggedTaskId === task.id;
                                const isDragOver = draggedOverTaskId === task.id;

                                return (
                                  <div
                                    key={task.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDragOver={(e) => handleDragOver(e, task.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, goal, task.id)}
                                    className={`p-2 rounded-xl border border-l-4 transition-all duration-150 flex items-center justify-between gap-2 select-none group ${pConfig.borderClass} ${
                                      isDragging 
                                        ? 'opacity-30 scale-95 border-dashed border-[#5C464B]' 
                                        : isDragOver
                                        ? 'bg-[#FFD1DB] ring-2 ring-[#FF688B] scale-[1.01]'
                                        : task.completed
                                        ? 'bg-[#191919] border-[#5C464B]/20 opacity-60 text-white/40'
                                        : 'bg-[#FFD1DB] border-[#FF688B]/60 text-[#1F1F1F] shadow-[0_0_12px_rgba(255,104,139,0.25)] hover:brightness-105'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {/* Drag Handle */}
                                      <div 
                                        className={`cursor-grab active:cursor-grabbing p-0.5 transition-colors ${
                                          task.completed 
                                            ? 'text-white/30 group-hover:text-white/70' 
                                            : 'text-[#1F1F1F]/40 group-hover:text-[#1F1F1F]'
                                        }`}
                                        title="Arrastrar para mover arriba o abajo"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>

                                      {/* Checkbox */}
                                      <button
                                        onClick={() => onToggleGoalTask(goal.id, task.id)}
                                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                          task.completed
                                            ? 'bg-[#1F1F1F] border-[#1F1F1F] text-[#FFD1DB] shadow-xs'
                                            : 'border-[#1F1F1F]/40 bg-white/30 hover:border-[#1F1F1F]'
                                        }`}
                                        title={task.completed ? 'Marcar como pendiente' : 'Marcar como cumplida'}
                                      >
                                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                      </button>

                                      {/* Priority Color Dot */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextP = getNextPriority(priorityKey);
                                          onUpdateGoalTaskPriority(goal.id, task.id, nextP);
                                        }}
                                        className={`w-3 h-3 rounded-full transition-all shrink-0 active:scale-75 shadow-xs ${pConfig.dotClass}`}
                                        title={`Prioridad: ${pConfig.label}. Haz clic para cambiar de color`}
                                        aria-label={`Prioridad: ${pConfig.label}`}
                                      />

                                      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                        <span className={`text-xs block leading-tight truncate ${
                                          task.completed ? 'line-through text-white/40' : 'text-[#1F1F1F] font-bold'
                                        }`}>
                                          <span className={`font-mono mr-1.5 text-[10px] ${
                                            task.completed ? 'text-white/30' : 'text-[#1F1F1F]/60'
                                          }`}>
                                            #{pIdx + 1}
                                          </span>
                                          {task.title}
                                        </span>
                                        <span 
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-[#FF688B]/20 text-[#FF2E63] border border-[#FF688B]/40 shrink-0"
                                          title="Tarea fijada en esta meta"
                                        >
                                          <Pin className="w-2.5 h-2.5 fill-[#FF2E63]" />
                                          <span>Fijada</span>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Pin Toggle Button */}
                                      <button
                                        type="button"
                                        onClick={() => onTogglePinGoalTask ? onTogglePinGoalTask(goal.id, task.id) : undefined}
                                        className="p-1 rounded-lg transition-all text-[#FF2E63] bg-[#FF688B]/20 hover:bg-[#FF688B]/35 shadow-xs"
                                        title="Desfijar tarea"
                                        aria-label="Desfijar tarea"
                                      >
                                        <Pin className="w-3.5 h-3.5 fill-[#FF2E63] stroke-[#FF2E63]" />
                                      </button>

                                      <button
                                        onClick={() => onDeleteGoalTask(goal.id, task.id)}
                                        className={`p-1 rounded-lg transition-colors shrink-0 ${
                                          task.completed 
                                            ? 'text-white/30 hover:text-[#FF688B] hover:bg-white/10' 
                                            : 'text-[#1F1F1F]/40 hover:text-rose-600 hover:bg-black/5'
                                        }`}
                                        title="Eliminar tarea"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Other Tasks */}
                        {visibleTasks.filter((t) => !t.isPinned).length > 0 && (
                          <div className="space-y-1.5">
                            {visibleTasks.filter((t) => t.isPinned).length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider px-1 pt-1.5">
                                <span>Otras tareas ({visibleTasks.filter((t) => !t.isPinned).length})</span>
                              </div>
                            )}
                            {visibleTasks
                              .filter((t) => !t.isPinned)
                              .map((task, oIdx) => {
                                const priorityKey = normalizePriority(task.priority);
                                const pConfig = CLEAN_PRIORITIES.find((p) => p.key === priorityKey) || CLEAN_PRIORITIES[0];
                                const isDragging = draggedTaskId === task.id;
                                const isDragOver = draggedOverTaskId === task.id;
                                const pinnedCount = visibleTasks.filter((t) => t.isPinned).length;

                                return (
                                  <div
                                    key={task.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onDragOver={(e) => handleDragOver(e, task.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, goal, task.id)}
                                    className={`p-2 rounded-xl border border-l-4 transition-all duration-150 flex items-center justify-between gap-2 select-none group ${pConfig.borderClass} ${
                                      isDragging 
                                        ? 'opacity-30 scale-95 border-dashed border-[#5C464B]' 
                                        : isDragOver
                                        ? 'bg-[#FFD1DB] ring-2 ring-[#FF688B] scale-[1.01]'
                                        : task.completed
                                        ? 'bg-[#191919] border-[#5C464B]/20 opacity-60 text-white/40'
                                        : 'bg-[#FFD1DB] border-[#FFD1DB] text-[#1F1F1F] hover:brightness-105 shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {/* Drag Handle */}
                                      <div 
                                        className={`cursor-grab active:cursor-grabbing p-0.5 transition-colors ${
                                          task.completed 
                                            ? 'text-white/30 group-hover:text-white/70' 
                                            : 'text-[#1F1F1F]/40 group-hover:text-[#1F1F1F]'
                                        }`}
                                        title="Arrastrar para mover arriba o abajo"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>

                                      {/* Checkbox */}
                                      <button
                                        onClick={() => onToggleGoalTask(goal.id, task.id)}
                                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                          task.completed
                                            ? 'bg-[#1F1F1F] border-[#1F1F1F] text-[#FFD1DB] shadow-xs'
                                            : 'border-[#1F1F1F]/40 bg-white/30 hover:border-[#1F1F1F]'
                                        }`}
                                        title={task.completed ? 'Marcar como pendiente' : 'Marcar como cumplida'}
                                      >
                                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                      </button>

                                      {/* Priority Color Dot */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextP = getNextPriority(priorityKey);
                                          onUpdateGoalTaskPriority(goal.id, task.id, nextP);
                                        }}
                                        className={`w-3 h-3 rounded-full transition-all shrink-0 active:scale-75 shadow-xs ${pConfig.dotClass}`}
                                        title={`Prioridad: ${pConfig.label}. Haz clic para cambiar de color`}
                                        aria-label={`Prioridad: ${pConfig.label}`}
                                      />

                                      <div className="flex-1 min-w-0">
                                        <span className={`text-xs block leading-tight truncate ${
                                          task.completed ? 'line-through text-white/40' : 'text-[#1F1F1F] font-bold'
                                        }`}>
                                          <span className={`font-mono mr-1.5 text-[10px] ${
                                            task.completed ? 'text-white/30' : 'text-[#1F1F1F]/60'
                                          }`}>
                                            #{pinnedCount + oIdx + 1}
                                          </span>
                                          {task.title}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Pin Toggle Button */}
                                      <button
                                        type="button"
                                        onClick={() => onTogglePinGoalTask ? onTogglePinGoalTask(goal.id, task.id) : undefined}
                                        className={`p-1 rounded-lg transition-all ${
                                          task.completed
                                            ? 'text-white/30 hover:text-white/70 hover:bg-white/10'
                                            : 'text-[#1F1F1F]/40 hover:text-[#1F1F1F] hover:bg-black/5'
                                        }`}
                                        title="Fijar tarea arriba"
                                        aria-label="Fijar tarea arriba"
                                      >
                                        <Pin className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        onClick={() => onDeleteGoalTask(goal.id, task.id)}
                                        className={`p-1 rounded-lg transition-colors shrink-0 ${
                                          task.completed 
                                            ? 'text-white/30 hover:text-[#FF688B] hover:bg-white/10' 
                                            : 'text-[#1F1F1F]/40 hover:text-rose-600 hover:bg-black/5'
                                        }`}
                                        title="Eliminar tarea"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal to Create New Goal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-sm max-h-[92dvh] flex flex-col overflow-hidden text-[#FFE8EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FF688B]" />
                <h3 className="text-sm font-extrabold text-white">Nueva Meta</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-5 space-y-3.5 text-xs overflow-y-auto overscroll-contain">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Título de la Meta *
                </label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ej. 20 cosas en los próximos 30 días"
                  className="w-full px-3.5 py-2 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl focus:outline-hidden focus:border-[#FF688B] text-xs text-white placeholder-white/40 font-semibold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                    Fecha límite *
                  </label>
                  <input
                    type="date"
                    required
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-2.5 py-1.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] font-mono [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                    Número de tareas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newGoalTargetCount}
                    onChange={(e) => setNewGoalTargetCount(Number(e.target.value))}
                    placeholder="20"
                    className="w-full px-2.5 py-1.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  {['#FFD1DB', '#FF688B', '#E5A0B6', '#C18C98', '#A855F7'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewGoalColor(c)}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        newGoalColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </div>
              </div>

              {/* Pin entire goal toggle */}
              <div className="flex items-center justify-between p-3 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span className={`p-1.5 rounded-lg border transition-all ${
                    newGoalIsPinned
                      ? 'bg-[#FF688B]/20 border-[#FF688B]/50 text-[#FF688B]'
                      : 'bg-black/20 border-white/10 text-white/40'
                  }`}>
                    <Pin className={`w-3.5 h-3.5 ${newGoalIsPinned ? 'fill-[#FF688B]' : ''}`} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">Fijar lista de tareas</span>
                    <span className="text-[10px] text-white/50 block">Aparecerá en la parte superior</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewGoalIsPinned(!newGoalIsPinned)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    newGoalIsPinned
                      ? 'bg-[#FF688B]/20 border-[#FF688B] text-[#FF688B]'
                      : 'bg-[#252525] border-[#5C464B]/50 text-white/50 hover:text-white'
                  }`}
                >
                  {newGoalIsPinned ? 'Fijada' : 'No fijar'}
                </button>
              </div>

              <div className="pt-3 border-t border-[#5C464B]/40 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white/75 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Bulk Adding Tasks with 3 Color Selectors */}
      {bulkAddGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-sm max-h-[92dvh] flex flex-col overflow-hidden text-[#FFE8EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-[#FFD1DB]" />
                <h3 className="text-sm font-extrabold text-white">Pegar Varias Tareas</h3>
              </div>
              <button
                onClick={() => setBulkAddGoalId(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkAddSubmit} className="p-5 space-y-3 text-xs overflow-y-auto overscroll-contain">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1.5">
                  Color de prioridad inicial:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CLEAN_PRIORITIES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setBulkAddPriority(p.key)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        bulkAddPriority === p.key
                          ? `${p.badgeClass} ring-2 ring-white/60 scale-[1.03]`
                          : 'bg-[#1F1F1F] text-white/60 border-[#5C464B]/50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass}`} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Tareas (una por línea):
                </label>
                <textarea
                  rows={7}
                  value={bulkAddText}
                  onChange={(e) => setBulkAddText(e.target.value)}
                  placeholder="Tarea 1&#10;Tarea 2&#10;Tarea 3..."
                  className="w-full px-3.5 py-2.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl focus:outline-hidden focus:border-[#FF688B] text-xs text-white placeholder-white/40 font-mono leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Pin toggle for bulk tasks */}
              <div className="flex items-center justify-between p-2.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Pin className={`w-3.5 h-3.5 ${bulkAddIsPinned ? 'fill-[#FF688B] text-[#FF688B]' : 'text-white/40'}`} />
                  <span className="text-xs font-bold text-white">Fijar estas tareas arriba</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkAddIsPinned(!bulkAddIsPinned)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    bulkAddIsPinned
                      ? 'bg-[#FF688B]/20 border-[#FF688B] text-[#FF688B]'
                      : 'bg-[#252525] border-[#5C464B]/50 text-white/50 hover:text-white'
                  }`}
                >
                  {bulkAddIsPinned ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              <div className="pt-2 border-t border-[#5C464B]/40 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkAddGoalId(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white/75 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!bulkAddText.trim()}
                  className="px-4 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white disabled:opacity-40 disabled:pointer-events-none rounded-full transition-all shadow-md shadow-[#FF688B]/30"
                >
                  Añadir Tareas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setEditingGoal(null)}
        >
          <div
            className="relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-sm max-h-[92dvh] flex flex-col overflow-hidden text-[#FFE8EF]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#5C464B]/40">
              <div className="flex items-center gap-2 text-[#FF688B]">
                <Target className="w-4 h-4" />
                <h3 className="text-sm font-extrabold text-white">Editar Meta</h3>
              </div>
              <button
                onClick={() => setEditingGoal(null)}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGoal} className="p-5 space-y-3.5 text-xs overflow-y-auto overscroll-contain">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Título de la Meta *
                </label>
                <input
                  type="text"
                  required
                  value={editGoalTitle}
                  onChange={(e) => setEditGoalTitle(e.target.value)}
                  placeholder="Título de la meta"
                  className="w-full px-3.5 py-2 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl focus:outline-hidden focus:border-[#FF688B] text-xs text-white placeholder-white/40 font-semibold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                    Fecha límite *
                  </label>
                  <input
                    type="date"
                    required
                    value={editGoalDate}
                    onChange={(e) => setEditGoalDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] font-mono [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                    Número de tareas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editGoalTargetCount}
                    onChange={(e) => setEditGoalTargetCount(Number(e.target.value))}
                    placeholder="20"
                    className="w-full px-2.5 py-1.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  {['#FFD1DB', '#FF688B', '#E5A0B6', '#C18C98', '#A855F7'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditGoalColor(c)}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        editGoalColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </div>
              </div>

              {/* Pin entire goal toggle */}
              <div className="flex items-center justify-between p-3 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span className={`p-1.5 rounded-lg border transition-all ${
                    editGoalIsPinned
                      ? 'bg-[#FF688B]/20 border-[#FF688B]/50 text-[#FF688B]'
                      : 'bg-black/20 border-white/10 text-white/40'
                  }`}>
                    <Pin className={`w-3.5 h-3.5 ${editGoalIsPinned ? 'fill-[#FF688B]' : ''}`} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">Fijar lista de tareas</span>
                    <span className="text-[10px] text-white/50 block">Mantener fija arriba en el tablero</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditGoalIsPinned(!editGoalIsPinned)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    editGoalIsPinned
                      ? 'bg-[#FF688B]/20 border-[#FF688B] text-[#FF688B]'
                      : 'bg-[#252525] border-[#5C464B]/50 text-white/50 hover:text-white'
                  }`}
                >
                  {editGoalIsPinned ? 'Fijada' : 'No fijar'}
                </button>
              </div>

              <div className="pt-3 border-t border-[#5C464B]/40 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white/75 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editGoalTitle.trim()}
                  className="px-4 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white disabled:opacity-40 disabled:pointer-events-none rounded-full transition-all shadow-md shadow-[#FF688B]/30"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Confirmation Modal */}
      {goalToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setGoalToDelete(null)}
        >
          <div
            className="relative bg-[#242424] border border-[#5C464B]/60 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-sm flex flex-col overflow-hidden text-[#FFE8EF] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">¿Eliminar meta?</h3>
                <span className="text-[11px] text-white/50">Esta acción no se puede deshacer</span>
              </div>
            </div>
            
            <p className="text-xs text-[#FFE8EF]/75 leading-relaxed mb-5">
              ¿Estás seguro de que deseas eliminar la meta <strong className="text-white">«{goalToDelete.title}»</strong> y todas sus tareas asociadas?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#5C464B]/40">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white/75 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-all shadow-md shadow-rose-600/30 active:scale-95"
              >
                Eliminar meta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
