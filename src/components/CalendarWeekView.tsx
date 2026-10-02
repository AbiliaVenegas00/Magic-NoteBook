import React from 'react';
import { Clock, Plus, Check } from 'lucide-react';
import { AssignmentTask } from '../types';
import { getWeekDays } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../utils/themeHelpers';

interface CalendarWeekViewProps {
  currentDate: Date;
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onCreateTaskForDayAndTime: (dateStr: string, timeStr: string) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00 (8 AM to 8 PM)

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  currentDate,
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onCreateTaskForDayAndTime,
}) => {
  const weekDays = getWeekDays(currentDate);

  // Separate tasks by day
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, AssignmentTask[]>();
    for (const task of tasks) {
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  return (
    <div 
      className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col transition-all duration-300" 
      id="calendar-week-container"
    >
      {/* Scroll wrapper for mobile phones */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px] sm:min-w-0">
          {/* 7-Day Column Header */}
          <div className="relative z-10 grid grid-cols-8 border-b border-[#5C464B]/50 bg-[#1F1F1F] text-xs font-semibold text-white">
            <div className="p-3 text-[#E5A0B6] border-r border-[#5C464B]/40 flex items-center justify-center font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#FF688B]" />
            </div>
            {weekDays.map(({ date, dateStr, isToday }) => (
              <div
                key={dateStr}
                className={`p-2.5 text-center border-r last:border-r-0 border-[#5C464B]/40 flex flex-col items-center gap-1 transition-all duration-200 ${
                  isToday ? 'bg-[#FFD1DB]/08' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider font-extrabold ${isToday ? 'text-[#FF688B]' : 'text-[#E5A0B6]'}`}>
                  {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isToday
                      ? 'bg-[#FF688B] text-white shadow-xs'
                      : 'text-white/90'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
            ))}
          </div>

          {/* Grid: Hours rows across 7 days */}
          <div className="relative z-10 grid grid-cols-8 divide-x divide-[#5C464B]/30 max-h-[640px] overflow-y-auto">
            {/* Time column */}
            <div className="flex flex-col divide-y divide-[#5C464B]/30 bg-[#191919] select-none">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-18 p-1.5 text-right pr-2 text-[10px] text-[#E5A0B6]/80 font-mono flex items-start justify-end"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 7 Days Columns */}
            {weekDays.map(({ dateStr, isToday }) => {
              const dayTasks = tasksByDay.get(dateStr) || [];

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col divide-y divide-[#5C464B]/30 transition-colors ${
                    isToday ? 'bg-[#FFD1DB]/03' : 'bg-transparent'
                  }`}
                >
                  {HOURS.map((hour) => {
                    const timeSlotStr = `${hour.toString().padStart(2, '0')}:00`;
                    const displayLabel = `${hour}:00`;

                    // Find tasks matching this hour
                    const matchingTasks = dayTasks.filter((t) => {
                      if (!t.dueTime) return false;
                      const [tHour] = t.dueTime.split(':').map(Number);
                      return tHour === hour;
                    });

                    return (
                      <div
                        key={`${dateStr}-${hour}`}
                        className={`relative p-1.5 transition-colors hover:bg-white/[0.04] group flex flex-col gap-1.5 min-h-[72px] ${
                          isToday ? 'bg-white/[0.015]' : 'bg-transparent'
                        }`}
                      >
                        {/* Hover quick add slot */}
                        <button
                          onClick={() => onCreateTaskForDayAndTime(dateStr, timeSlotStr)}
                          className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#FF688B] hover:text-white hover:bg-white/20 transition-all z-10 scale-90 hover:scale-110 active:scale-95 shadow-xs"
                          title={`Añadir a las ${displayLabel}`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* Task cards in this hour slot - #FFD1DB Event pills */}
                        {matchingTasks.map((task) => {
                          const isDone = task.status === 'completed';
                          const priority = PRIORITY_CONFIG[task.priority];

                          return (
                            <div
                              key={task.id}
                              onClick={() => onSelectTask(task)}
                              className={`p-1.5 rounded-xl text-xs cursor-pointer transition-all duration-150 shadow-xs flex items-start gap-1.5 ${
                                isDone
                                  ? 'bg-[#FFD1DB]/50 text-[#1F1F1F] line-through opacity-70'
                                  : 'bg-[#FFD1DB] text-[#1F1F1F] hover:brightness-105'
                              }`}
                            >
                              <button
                                onClick={(e) => onToggleTaskComplete(task.id, e)}
                                className={`w-3.5 h-3.5 mt-0.5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'bg-[#1F1F1F] border-[#1F1F1F] text-[#FFD1DB]'
                                    : 'border-[#1F1F1F]/40 bg-white/20 hover:border-[#1F1F1F]'
                                }`}
                              >
                                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.dotClass}`} />
                                  <p className="font-black uppercase tracking-tight text-[11px] leading-tight text-[#1F1F1F] truncate">
                                    {task.title}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[#1F1F1F]/80 font-mono font-semibold">
                                  <span>{task.dueTime}</span>
                                  <span>·</span>
                                  <span>{task.durationMinutes}m</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
