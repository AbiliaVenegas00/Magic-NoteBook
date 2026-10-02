import React, { useState } from 'react';
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
  ArrowUpDown
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
  onToggleGoalTask: (goalId: string, taskId: string) => void;
  onAddGoalTask: (goalId: string, taskTitle: string, priority?: PriorityLevel | GoalPriority) => void;
  onDeleteGoalTask: (goalId: string, taskId: string) => void;
  onUpdateGoalTaskPriority: (goalId: string, taskId: string, priority: PriorityLevel | GoalPriority) => void;
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
  onToggleGoalTask,
  onAddGoalTask,
  onDeleteGoalTask,
  onUpdateGoalTaskPriority,
  onReorderGoalTasks,
  isCreateGoalModalOpen = false,
  onOpenCreateGoalModal,
  onCloseCreateGoalModal,
}) => {
  const [localCreateModalOpen, setLocalCreateModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDays, setNewGoalDays] = useState(30);
  const [newGoalTargetCount, setNewGoalTargetCount] = useState<number>(20);
  const [newGoalColor, setNewGoalColor] = useState('#FF99AA');

  // Inline input state per goal: map goalId -> input text
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  // Selected priority per goal for newly added task: map goalId -> CleanPriority
  const [taskPriorities, setTaskPriorities] = useState<Record<string, CleanPriority>>({});

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null);

  // Bulk add modal per goal
  const [bulkAddGoalId, setBulkAddGoalId] = useState<string | null>(null);
  const [bulkAddText, setBulkAddText] = useState('');
  const [bulkAddPriority, setBulkAddPriority] = useState<CleanPriority>('high');

  // Filter for tasks: 'all' | 'pending' | 'completed'
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Confirmation modal to reliably delete goal without blocked window.confirm
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

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

    const targetDate = new Date(Date.now() + (newGoalDays || 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    onAddGoal({
      title: newGoalTitle.trim(),
      targetDays: newGoalDays || 30,
      targetDate,
      targetCount: newGoalTargetCount > 0 ? newGoalTargetCount : undefined,
      color: newGoalColor,
      tasks: [],
    });

    setNewGoalTitle('');
    setNewGoalDays(30);
    setNewGoalTargetCount(20);
    handleCloseModal();
  };

  const handleInlineAddTask = (goalId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = taskInputs[goalId]?.trim();
    if (!text) return;

    const priority = taskPriorities[goalId] || 'high';
    onAddGoalTask(goalId, text, priority);
    setTaskInputs((prev) => ({ ...prev, [goalId]: '' }));
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
        onAddGoalTask(bulkAddGoalId, cleaned, bulkAddPriority);
      }
    }

    setBulkAddGoalId(null);
    setBulkAddText('');
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
    currentTasks.splice(targetIndex, 0, movedTask);

    if (onReorderGoalTasks) {
      onReorderGoalTasks(goal.id, currentTasks);
    }
  };

  // Sort tasks in goal by color hierarchy: Rojo (Alta) -> Amarillo (Media) -> Verde (Baja)
  const handleSortByColor = (goal: Goal) => {
    const currentTasks = [...goal.tasks];
    currentTasks.sort((a, b) => {
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

  // Find nearest remaining time among unfinished goals
  const unfinishedGoals = goals.filter((g) => {
    const total = g.tasks.length;
    const completed = g.tasks.filter((t) => t.completed).length;
    return total === 0 || completed < total;
  });

  const nearestGoalTime = unfinishedGoals.length > 0 
    ? calculateTimeRemaining(unfinishedGoals[0], false)
    : null;

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

            {/* Overall Remaining Time Pill */}
            {nearestGoalTime && (
              <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full shadow-xs text-xs font-mono font-bold ${
                nearestGoalTime.urgency === 'overdue'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : nearestGoalTime.urgency === 'soon'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-[#3D2C30] border-[#5C464B] text-[#FFD1DB]'
              }`}>
                <Clock className="w-3.5 h-3.5 text-[#FF688B]" />
                <span>{nearestGoalTime.label}</span>
              </div>
            )}

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
          {goals.map((goal) => {
            const totalTasks = goal.tasks.length;
            const completedTasks = goal.tasks.filter((t) => t.completed).length;
            
            const isFinished = totalTasks > 0 && completedTasks === totalTasks && (!goal.targetCount || completedTasks >= goal.targetCount);
            const timeInfo = calculateTimeRemaining(goal, isFinished);

            // Filter tasks based on view filter
            const visibleTasks = goal.tasks.filter((t) => {
              if (taskFilter === 'pending') return !t.completed;
              if (taskFilter === 'completed') return t.completed;
              return true;
            });

            const currentInputPriority = taskPriorities[goal.id] || 'high';

            return (
              <div
                key={goal.id}
                className="relative bg-[#252525] border border-[#5C464B]/50 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between transition-all duration-200 hover:border-[#FF688B]/60 overflow-hidden"
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
                      {isFinished && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Completada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleSortByColor(goal)}
                        className="p-1.5 rounded-xl text-[#FFD1DB]/60 hover:text-white hover:bg-white/10 transition-all"
                        title="Ordenar automáticamente por color de prioridad (Rojo → Amarillo → Verde)"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#FF688B]" />
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

                    {/* Remaining Time Buffer Bar (with #FF688B progress accent) */}
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-1.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFinished
                            ? 'bg-emerald-400'
                            : timeInfo.urgency === 'overdue'
                            ? 'bg-rose-500'
                            : timeInfo.urgency === 'soon'
                            ? 'bg-amber-400'
                            : 'bg-[#FF688B]'
                        }`}
                        style={{ width: `${isFinished ? 100 : timeInfo.percentRemaining}%` }}
                      />
                    </div>

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

                  {/* Inline Add Task Input with 3 Color Selectors (Red, Yellow, Green) */}
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

                    <input
                      type="text"
                      value={taskInputs[goal.id] || ''}
                      onChange={(e) => setTaskInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="Escribe una tarea y presiona Enter..."
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
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-[#3D2C30] hover:bg-[#4E393E] text-[#FFD1DB] border border-[#5C464B] rounded-xl transition-all shrink-0"
                      title="Pegar varias tareas de una sola vez"
                    >
                      Varias
                    </button>
                  </form>

                  {/* Task List with Drag and Drop Reordering */}
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {visibleTasks.length === 0 ? (
                      <div className="py-5 text-center border border-dashed border-[#5C464B]/40 rounded-xl text-xs text-white/40">
                        {goal.tasks.length === 0 ? 'Sin tareas. Añade una arriba.' : 'No hay tareas en este filtro.'}
                      </div>
                    ) : (
                      visibleTasks.map((task, index) => {
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
                                : 'bg-[#FFD1DB] border-[#FFD1DB] text-[#1F1F1F] hover:brightness-105 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Drag Handle to drag up or down */}
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

                              {/* Priority Color Dot - Clickable to cycle Red -> Yellow -> Green */}
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
                                    #{index + 1}
                                  </span>
                                  {task.title}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => onDeleteGoalTask(goal.id, task.id)}
                              className={`p-1 rounded-lg transition-colors shrink-0 ${
                                task.completed 
                                  ? 'text-white/30 hover:text-[#FF688B] hover:bg-white/10' 
                                  : 'text-[#1F1F1F]/40 hover:text-rose-600 hover:bg-black/5'
                              }`}
                              title="Eliminar tarea"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
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
                    Duración (Días)
                  </label>
                  <select
                    value={newGoalDays}
                    onChange={(e) => setNewGoalDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-[#1F1F1F] border border-[#5C464B]/50 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] font-mono"
                  >
                    <option value={7}>7 días</option>
                    <option value={15}>15 días</option>
                    <option value={30}>30 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                  </select>
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
