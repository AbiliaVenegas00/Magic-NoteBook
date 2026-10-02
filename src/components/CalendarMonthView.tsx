import React from 'react';
import { Plus, Check, Clock } from 'lucide-react';
import { AssignmentTask } from '../types';
import { getMonthDaysGrid, getTodayDateString, formatTimeSlot, isOverdue } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../utils/themeHelpers';

interface CalendarMonthViewProps {
  currentDate: Date;
  tasks: AssignmentTask[];
  onSelectTask: (task: AssignmentTask) => void;
  onToggleTaskComplete: (taskId: string, e: React.MouseEvent) => void;
  onSelectDay: (dateStr: string) => void;
  onCreateTaskForDay: (dateStr: string) => void;
}

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  tasks,
  onSelectTask,
  onToggleTaskComplete,
  onSelectDay,
  onCreateTaskForDay,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysGrid = getMonthDaysGrid(year, month);
  const todayStr = getTodayDateString();

  // Map of dateStr -> tasks
  const tasksByDate = React.useMemo(() => {
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
      className="relative bg-[#1F1F1F] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] transition-all duration-300 mt-2.5 sm:mt-3.5" 
      id="calendar-month-container"
    >
      {/* Weekday Header Row - styled with #3D2C30 background */}
      <div className="relative z-10 grid grid-cols-7 border-b border-[#5C464B]/50 bg-[#3D2C30] text-center py-2 sm:py-3 px-1 sm:px-2">
        {WEEKDAYS.map((day) => (
          <div 
            key={day} 
            className="flex items-center justify-center text-[10px] sm:text-xs uppercase tracking-normal sm:tracking-widest font-extrabold text-[#E5A0B6]"
          >
            <span>{day}</span>
          </div>
        ))}
      </div>

      {/* Days Grid - styled cleanly with #5C464B dividers and phone responsive heights */}
      <div className="relative z-10 grid grid-cols-7 divide-x divide-y divide-[#5C464B]/35 bg-[#1F1F1F]">
        {daysGrid.map(({ date, dateStr, isCurrentMonth }) => {
          const dayNumber = date.getDate();
          const dayTasks = tasksByDate.get(dateStr) || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`min-h-[75px] sm:min-h-[140px] p-1 sm:p-2.5 flex flex-col justify-between transition-all duration-200 group relative ${
                !isCurrentMonth 
                  ? 'bg-[#191919] text-[#5C464B]' 
                  : 'bg-[#1F1F1F] text-white hover:bg-[#252525]'
              } ${isToday ? 'bg-[#FFD1DB]/05 ring-1 sm:ring-2 ring-inset ring-[#FF688B]/60' : ''}`}
            >
              {/* Day Header Row: Number and Hover Add Button */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span
                  onClick={() => onSelectDay(dateStr)}
                  className={`cursor-pointer text-[10px] sm:text-xs font-bold transition-all px-1 sm:px-1.5 py-0.5 rounded-lg ${
                    isToday
                      ? 'bg-[#FF688B] text-white font-extrabold shadow-sm'
                      : isCurrentMonth
                      ? 'text-white/90 hover:text-[#FF688B]'
                      : 'text-[#5C464B]'
                  }`}
                  title={dateStr}
                >
                  {dayNumber}
                </span>

                {/* Quick Add '+' icon in #FF688B */}
                <button
                  onClick={() => onCreateTaskForDay(dateStr)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 sm:p-1 text-[#FF688B] hover:scale-125 transition-all duration-150 active:scale-95"
                  title="Añadir plan"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Tasks List - with responsive #FFD1DB Event Pills */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden justify-start">
                {dayTasks.slice(0, 3).map((task) => {
                  const isDone = task.status === 'completed';
                  const priority = PRIORITY_CONFIG[task.priority];
                  const overdue = isOverdue(task.dueDate, task.status);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={`text-left p-1 sm:p-1.5 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-1 sm:gap-1.5 select-none shadow-xs group/item hover:brightness-105 active:scale-95 ${
                        isDone
                          ? 'bg-[#FFD1DB]/50 opacity-60 text-[#1F1F1F] line-through'
                          : overdue
                          ? 'bg-[#FFD1DB] ring-1 ring-[#FF688B] text-[#1F1F1F]'
                          : 'bg-[#FFD1DB] text-[#1F1F1F]'
                      }`}
                    >
                      {/* Checkbox circle */}
                      <button
                        onClick={(e) => onToggleTaskComplete(task.id, e)}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isDone
                            ? 'bg-[#1F1F1F] border-[#1F1F1F] text-[#FFD1DB]'
                            : 'border-[#1F1F1F]/40 bg-white/20 hover:border-[#1F1F1F]'
                        }`}
                        title={isDone ? 'Marcar incompleto' : 'Marcar completado'}
                      >
                        {isDone && <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span
                            className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${priority.dotClass}`}
                          />
                          {task.googleEventId && (
                            <span
                              title="Sincronizado con Google Calendar"
                              className="text-[9px] font-black text-[#1F1F1F]/60 shrink-0"
                            >
                              G·
                            </span>
                          )}
                          <span className="truncate font-black uppercase tracking-tight text-[9px] sm:text-[11px] text-[#1F1F1F] leading-tight">
                            {task.title}
                          </span>
                        </div>

                        {task.dueTime && (
                          <div className="hidden sm:flex items-center gap-1 text-[9px] font-semibold text-[#1F1F1F]/80 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatTimeSlot(task.dueTime)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayTasks.length > 3 && (
                  <button
                    onClick={() => onSelectDay(dateStr)}
                    className="text-[9px] sm:text-[10px] font-extrabold text-[#E5A0B6] hover:text-[#FFD1DB] text-left px-0.5 mt-0.5"
                  >
                    +{dayTasks.length - 3} más...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
