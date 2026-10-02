import React from 'react';
import { Plus, Check, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { AssignmentTask, TaskStatus } from '../types';
import { formatTimeSlot, isOverdue } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../utils/themeHelpers';

interface TaskBoardViewProps {
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onCreateTaskWithStatus: (status: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; title: string; indicatorColor: string }[] = [
  { status: 'todo', title: 'Por hacer', indicatorColor: 'bg-[#5C464B]' },
  { status: 'in_progress', title: 'En progreso', indicatorColor: 'bg-[#FF688B]' },
  { status: 'waiting', title: 'En espera', indicatorColor: 'bg-[#E5A0B6]' },
  { status: 'completed', title: 'Completados', indicatorColor: 'bg-[#FFD1DB]' },
];

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onUpdateTaskStatus,
  onCreateTaskWithStatus,
}) => {
  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'waiting';
    if (current === 'waiting') return 'completed';
    return null;
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'completed') return 'waiting';
    if (current === 'waiting') return 'in_progress';
    if (current === 'in_progress') return 'todo';
    return null;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="task-board-container">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);

        return (
          <div
            key={col.status}
            className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] flex flex-col min-h-[520px] transition-all duration-300"
          >
            {/* Column Header */}
            <div className="p-3.5 sm:px-4 border-b border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.indicatorColor} shadow-sm`} />
                <h3 className="font-extrabold text-xs text-white tracking-tight">
                  {col.title}
                </h3>
                <span className="text-[11px] text-[#FFD1DB] font-mono font-bold px-2 py-0.5 rounded-full bg-[#3D2C30] border border-[#5C464B]">
                  {columnTasks.length}
                </span>
              </div>

              <button
                onClick={() => onCreateTaskWithStatus(col.status)}
                className="p-1 rounded-xl bg-[#3D2C30] hover:bg-[#4E393E] text-[#FF688B] hover:text-white transition-all border border-[#5C464B] shadow-xs active:scale-95"
                title={`Añadir a ${col.title}`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="p-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[620px] bg-transparent relative z-10">
              {columnTasks.length === 0 ? (
                <div className="h-32 border border-dashed border-[#5C464B]/40 rounded-2xl flex flex-col items-center justify-center text-xs text-[#FFE8EF]/40 bg-black/10">
                  <span className="font-medium">Sin planes en esta columna</span>
                  <button
                    onClick={() => onCreateTaskWithStatus(col.status)}
                    className="mt-2 text-[11px] text-[#FF688B] hover:underline font-bold"
                  >
                    + Añadir plan
                  </button>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority];
                  const overdue = isOverdue(task.dueDate, task.status);
                  const isDone = task.status === 'completed';
                  const next = getNextStatus(task.status);
                  const prev = getPrevStatus(task.status);

                  return (
                    <div
                      key={task.id}
                      className={`border rounded-2xl p-3.5 transition-all duration-150 flex flex-col justify-between gap-2.5 shadow-xs group hover:translate-y-[-2px] ${
                        isDone
                          ? 'border-[#5C464B]/30 bg-[#191919] opacity-70'
                          : overdue
                          ? 'border-[#FF688B]/60 bg-[#2b2426] hover:border-[#FF688B] text-white shadow-[0_0_12px_rgba(255,104,139,0.15)]'
                          : 'border-[#5C464B]/40 bg-[#282828] hover:bg-[#2d2d2d] hover:border-[#FF688B]/60 text-white'
                      }`}
                    >
                      {/* Card Top: Priority & Due Date */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="flex items-center gap-1.5 text-[#FFE8EF]/80 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
                          <span className="text-[10px]">{priority.label}</span>
                        </span>

                        <div
                          className={`flex items-center gap-1 text-[10px] font-mono ${
                            overdue ? 'text-[#FF688B] font-bold' : 'text-[#E5A0B6]'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{task.dueDate.slice(5)}</span>
                          {task.dueTime && <span>{formatTimeSlot(task.dueTime)}</span>}
                        </div>
                      </div>

                      {/* Card Middle: Clickable Title */}
                      <div
                        onClick={() => onSelectTask(task)}
                        className="cursor-pointer group-hover:text-[#FFD1DB] transition-colors"
                      >
                        <h4
                          className={`text-xs font-bold leading-snug break-words ${
                            isDone ? 'line-through text-white/40' : 'text-[#FFE8EF]'
                          }`}
                        >
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-[#FFE8EF]/50 line-clamp-2 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom: Checklist Stats & Column Shift Controls */}
                      <div className="pt-2 border-t border-[#5C464B]/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => onToggleTaskComplete(task.id, e)}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isDone
                                ? 'bg-[#FF688B] border-[#FF688B] text-white shadow-xs'
                                : 'border-[#5C464B] hover:border-[#FF688B] bg-black/30'
                            }`}
                            title={isDone ? 'Marcar incompleto' : 'Marcar completado'}
                          >
                            {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>

                          {task.subtasks.length > 0 && (
                            <span className="text-[10px] font-mono text-[#E5A0B6]">
                              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                            </span>
                          )}
                        </div>

                        {/* Move Left / Right Buttons */}
                        <div className="flex items-center gap-1">
                          {prev && (
                            <button
                              onClick={() => onUpdateTaskStatus(task.id, prev)}
                              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              title="Mover columna anterior"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => onUpdateTaskStatus(task.id, next)}
                              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              title="Mover siguiente columna"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
