import React from 'react';
import { Plus, Check, Clock } from 'lucide-react';
import { AssignmentTask, PriorityLevel } from '../types';
import { formatHumanDate, isOverdue } from '../utils/dateUtils';

interface EisenhowerMatrixViewProps {
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onCreateTaskWithPriority: (priority: PriorityLevel) => void;
}

const QUADRANTS: {
  priority: PriorityLevel;
  title: string;
  badge: string;
  dotColor: string;
}[] = [
  {
    priority: 'urgent_important',
    title: 'Hacer primero',
    badge: 'Urgente e importante',
    dotColor: 'bg-[#FF6688]',
  },
  {
    priority: 'important',
    title: 'Planificar',
    badge: 'Importante',
    dotColor: 'bg-[#FF99AA]',
  },
  {
    priority: 'urgent',
    title: 'Resolver rápido',
    badge: 'Urgente',
    dotColor: 'bg-[#FFB0CC]',
  },
  {
    priority: 'routine',
    title: 'Rutina',
    badge: 'Baja prioridad',
    dotColor: 'bg-[#A13653]',
  },
];

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onCreateTaskWithPriority,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="eisenhower-matrix-container">
      {QUADRANTS.map((quad) => {
        const quadTasks = tasks.filter((t) => t.priority === quad.priority);

        return (
          <div
            key={quad.priority}
            className="relative bg-[#191923]/40 backdrop-blur-2xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(255,153,170,0.2)] ring-1 ring-white/10 p-4 sm:p-5 flex flex-col min-h-[380px] transition-all duration-300"
          >
            {/* Specular crystal reflection streaks & frosted light flares */}
            <div className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-20" aria-hidden="true" />
            <div className="pointer-events-none absolute top-[1px] inset-x-0 h-12 bg-gradient-to-b from-white/[0.08] via-[#FF99AA]/[0.03] to-transparent z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-gradient-to-br from-white/15 via-[#FF99AA]/10 to-transparent rounded-full blur-2xl z-0" aria-hidden="true" />

            {/* Quadrant Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${quad.dotColor} shadow-xs`} />
                <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight">
                  {quad.title}
                </h3>
                <span className="text-[11px] text-[#FFB0CC] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                  {quad.badge}
                </span>
                <span className="text-[11px] text-[#FFE8EF]/60 font-mono">
                  ({quadTasks.length})
                </span>
              </div>

              <button
                onClick={() => onCreateTaskWithPriority(quad.priority)}
                className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.18] text-[#FF99AA] hover:text-white transition-all border border-white/15 shadow-xs active:scale-95"
                title="Añadir plan a este cuadrante"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Tasks List */}
            <div className="pt-3 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[400px] relative z-10">
              {quadTasks.length === 0 ? (
                <div className="h-32 border border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center text-xs text-[#FFE8EF]/40 bg-white/[0.01]">
                  <span className="font-medium">Sin planes en este cuadrante</span>
                  <button
                    onClick={() => onCreateTaskWithPriority(quad.priority)}
                    className="mt-2 text-[11px] text-[#FF99AA] hover:underline font-bold"
                  >
                    + Agregar plan
                  </button>
                </div>
              ) : (
                quadTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  const overdue = isOverdue(task.dueDate, task.status);

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-2xl border transition-all duration-150 flex items-start gap-2.5 shadow-xs backdrop-blur-md group hover:translate-x-0.5 ${
                        isDone
                          ? 'border-white/10 bg-white/[0.02] text-[#FFE8EF]/40 line-through opacity-70'
                          : overdue
                          ? 'border-[#FF6688]/60 bg-[#A13653]/30 hover:border-white text-white shadow-[0_0_12px_rgba(255,102,136,0.15)]'
                          : 'border-white/15 bg-white/[0.07] hover:bg-white/[0.14] hover:border-[#FF99AA]/60 text-white'
                      }`}
                    >
                      <button
                        onClick={(e) => onToggleTaskComplete(task.id, e)}
                        className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isDone
                            ? 'bg-[#FF99AA] border-[#FFB0CC] text-[#0F0F1A]'
                            : 'border-white/30 hover:border-[#FF99AA] bg-black/40'
                        }`}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectTask(task)}>
                        <p className={`text-xs font-bold leading-snug truncate ${isDone ? 'text-[#FFE8EF]/40 line-through' : 'text-white'}`}>
                          {task.title}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#FFB0CC]/80 font-mono">
                          <span className={overdue ? 'text-[#FF6688] font-bold' : ''}>
                            {formatHumanDate(task.dueDate)}
                          </span>
                          {task.dueTime && <span>· {task.dueTime}</span>}
                          {task.subtasks.length > 0 && (
                            <span className="text-white/40">· {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} sub</span>
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

