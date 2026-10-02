import React from 'react';
import { Plus, Check, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { AssignmentTask } from '../types';
import { formatHumanDate, formatTimeSlot, isOverdue } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../utils/themeHelpers';

interface CalendarDayViewProps {
  currentDate: Date;
  dateStr: string;
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onCreateTaskForDay: (dateStr: string) => void;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  currentDate,
  dateStr,
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onCreateTaskForDay,
}) => {
  const isToday = new Date().toISOString().slice(0, 10) === dateStr;

  // Filter tasks for this day
  const dayTasks = tasks
    .filter((task) => task.dueDate === dateStr)
    .sort((a, b) => {
      if (!a.dueTime) return 1;
      if (!b.dueTime) return -1;
      return a.dueTime.localeCompare(b.dueTime);
    });

  return (
    <div className="space-y-4 max-w-4xl mx-auto" id="calendar-day-container">
      
      {/* Day Summary Top Banner */}
      <div 
        className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#3D2C30] border border-[#5C464B] flex items-center justify-center text-[#FFD1DB]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-extrabold text-white capitalize tracking-tight">
            {formatHumanDate(dateStr)}
          </h2>
          {isToday && (
            <span className="px-3 py-0.5 text-[11px] font-extrabold rounded-full bg-[#FF688B] text-white shadow-xs">
              Hoy
            </span>
          )}
        </div>

        <button
          onClick={() => onCreateTaskForDay(dateStr)}
          className="px-4 py-2 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all flex items-center gap-1.5 shadow-md shadow-[#FF688B]/30 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Añadir plan</span>
        </button>
      </div>

      {/* Day's Tasks Detailed List */}
      <div 
        className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-all overflow-hidden"
      >
        <div>
          {dayTasks.length === 0 ? (
            <div className="text-center py-14 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#3D2C30] border border-[#5C464B] flex items-center justify-center mb-3.5 text-[#E5A0B6]">
                <Clock className="w-7 h-7 stroke-[1.5]" />
              </div>
              <p className="text-sm text-white font-bold">Día libre de planes</p>
              <p className="text-xs text-[#FFE8EF]/60 mt-1 max-w-xs leading-relaxed">No tienes planes agendados para esta fecha. Puedes añadir un plan nuevo o tomarte un descanso.</p>
              <button
                onClick={() => onCreateTaskForDay(dateStr)}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#FF688B] hover:bg-[#ff7a9b] rounded-full transition-all shadow-md shadow-[#FF688B]/30 flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Crear un nuevo plan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayTasks.map((task) => {
                const priority = PRIORITY_CONFIG[task.priority];
                const isDone = task.status === 'completed';
                const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border border-l-4 border-l-[#FFD1DB] transition-all duration-150 flex items-center justify-between gap-4 shadow-xs group ${
                      isDone
                        ? 'bg-[#191919] border-[#5C464B]/20 text-white/40 opacity-70'
                        : 'bg-[#262626] hover:bg-[#2b2b2b] border-[#5C464B]/40 hover:border-[#FFD1DB]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={(e) => onToggleTaskComplete(task.id, e)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isDone
                            ? 'bg-[#FF688B] border-[#FF688B] text-white'
                            : 'border-[#5C464B] hover:border-[#FF688B] bg-[#1F1F1F]'
                        }`}
                        title={isDone ? 'Marcar incompleto' : 'Marcar completado'}
                      >
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectTask(task)}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${priority.dotClass}`} />
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${isDone ? 'line-through text-white/40' : 'text-[#FFE8EF]'}`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[#E5A0B6] font-mono">
                          {task.dueTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#FF688B]" />
                              <span>{formatTimeSlot(task.dueTime)}</span>
                              {task.durationMinutes > 0 && <span className="text-white/40">({task.durationMinutes}m)</span>}
                            </div>
                          )}

                          {task.subtasks.length > 0 && (
                            <span className="text-[10px] text-white/70 bg-[#3D2C30] px-2 py-0.5 rounded-lg border border-[#5C464B]/50">
                              {completedSubtasks}/{task.subtasks.length} subtareas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectTask(task)}
                      className="px-3.5 py-1.5 text-xs font-bold text-[#FFD1DB] hover:text-white bg-[#3D2C30] hover:bg-[#4E393E] rounded-full transition-all shrink-0 border border-[#5C464B] active:scale-95"
                    >
                      Ver detalles
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
