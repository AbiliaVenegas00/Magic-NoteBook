import React from 'react';
import { Plus, Check, Clock, Calendar as CalendarIcon, X, ChevronRight } from 'lucide-react';
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

function formatDateHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

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

  const [selectedDayModal, setSelectedDayModal] = React.useState<string | null>(null);

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

  // Tasks for the active modal, strictly sorted by time
  const sortedModalTasks = React.useMemo(() => {
    if (!selectedDayModal) return [];
    const list = tasksByDate.get(selectedDayModal) || [];
    return [...list].sort((a, b) => {
      // 1. Tasks with specified dueTime come first, ordered chronologically
      if (a.dueTime && b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueTime && !b.dueTime) return -1;
      if (!a.dueTime && b.dueTime) return 1;
      return 0;
    });
  }, [selectedDayModal, tasksByDate]);

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
          const hasPlans = dayTasks.length > 0;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (hasPlans) {
                  setSelectedDayModal(dateStr);
                }
              }}
              className={`min-h-[75px] sm:min-h-[140px] p-1 sm:p-2.5 flex flex-col justify-between transition-all duration-200 group relative ${
                hasPlans ? 'cursor-pointer hover:ring-1 hover:ring-[#FF688B]/60' : ''
              } ${
                !isCurrentMonth 
                  ? 'bg-[#191919] text-[#5C464B]' 
                  : 'bg-[#1F1F1F] text-white hover:bg-[#252525]'
              } ${isToday ? 'bg-[#FFD1DB]/05 ring-1 sm:ring-2 ring-inset ring-[#FF688B]/60' : ''}`}
            >
              {/* Day Header Row: Number and Hover Add Button */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasPlans) {
                      setSelectedDayModal(dateStr);
                    } else {
                      onCreateTaskForDay(dateStr);
                    }
                  }}
                  className={`cursor-pointer text-[10px] sm:text-xs font-bold transition-all px-1 sm:px-1.5 py-0.5 rounded-lg ${
                    isToday
                      ? 'bg-[#FF688B] text-white font-extrabold shadow-sm'
                      : isCurrentMonth
                      ? 'text-white/90 hover:text-[#FF688B]'
                      : 'text-[#5C464B]'
                  }`}
                  title={hasPlans ? `${dayTasks.length} planes en este día (clic para ver lista)` : dateStr}
                >
                  {dayNumber}
                </span>

                {/* Quick Add '+' icon in #FF688B */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTaskForDay(dateStr);
                  }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayModal(dateStr);
                      }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTaskComplete(task.id, e);
                        }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDayModal(dateStr);
                    }}
                    className="text-[9px] sm:text-[10px] font-extrabold text-[#E5A0B6] hover:text-[#FFD1DB] text-left px-0.5 mt-0.5 cursor-pointer"
                  >
                    +{dayTasks.length - 3} más...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Ver todos los planes del día ordenados por hora */}
      {selectedDayModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedDayModal(null)}
        >
          <div 
            className="relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden text-[#FFE8EF]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#5C464B]/40 bg-[#1F1F1F]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#3D2C30] border border-[#5C464B] flex items-center justify-center text-[#FFD1DB] shrink-0 shadow-xs">
                  <CalendarIcon className="w-5 h-5 text-[#FF688B]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white capitalize truncate">
                      {formatDateHeading(selectedDayModal)}
                    </h3>
                    {selectedDayModal === todayStr && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF688B] text-white shrink-0">
                        Hoy
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#E5A0B6] font-medium mt-0.5">
                    {sortedModalTasks.length} {sortedModalTasks.length === 1 ? 'plan programado' : 'planes programados'} · Ordenados por hora
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const date = selectedDayModal;
                    setSelectedDayModal(null);
                    onCreateTaskForDay(date);
                  }}
                  className="px-3 py-1.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 flex items-center gap-1 active:scale-95"
                  title="Añadir plan para este día"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="hidden sm:inline">Nuevo plan</span>
                </button>

                <button
                  onClick={() => setSelectedDayModal(null)}
                  className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of plans ordered chronologically by hour */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
              {sortedModalTasks.length === 0 ? (
                <div className="py-12 text-center text-white/50 flex flex-col items-center justify-center">
                  <Clock className="w-8 h-8 text-[#FF688B]/50 mb-2" />
                  <p className="text-sm font-bold text-white">Sin planes para este día</p>
                  <p className="text-xs text-[#FFE8EF]/60 mt-0.5">Puedes programar tu primer plan con el botón de arriba.</p>
                </div>
              ) : (
                sortedModalTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  const priority = PRIORITY_CONFIG[task.priority];
                  const overdue = isOverdue(task.dueDate, task.status);

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedDayModal(null);
                        onSelectTask(task);
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group hover:border-[#FF688B]/60 active:scale-[0.99] select-none ${
                        isDone
                          ? 'bg-[#191919] border-[#5C464B]/30 text-white/40 opacity-70'
                          : overdue
                          ? 'bg-[#282124] border-[#FF688B]/50 hover:bg-[#302529]'
                          : 'bg-[#1F1F1F] border-[#5C464B]/40 hover:bg-[#252525]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskComplete(task.id, e);
                          }}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : 'border-[#FFD1DB]/40 hover:border-[#FF688B] bg-white/5'
                          }`}
                          title={isDone ? 'Marcar incompleto' : 'Marcar completado'}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        {/* Plan Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {/* Time Badge (prominently shown and ordered) */}
                            {task.dueTime ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF688B]/20 text-[#FFD1DB] font-mono text-xs font-extrabold border border-[#FF688B]/40 shadow-xs">
                                <Clock className="w-3 h-3 text-[#FF688B]" />
                                <span>{formatTimeSlot(task.dueTime)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-white/50 font-mono text-[11px]">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Todo el día</span>
                              </span>
                            )}

                            {/* Priority badge */}
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                              <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
                              <span>{priority.label}</span>
                            </span>

                            {task.googleEventId && (
                              <span className="text-[10px] font-bold text-[#FFD1DB] bg-[#3D2C30] border border-[#5C464B] px-1.5 py-0.2 rounded-md">
                                Google Calendar
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs sm:text-sm font-extrabold text-white truncate ${
                            isDone ? 'line-through text-white/40' : ''
                          }`}>
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[11px] text-white/50 truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="text-[10px] font-mono text-[#E5A0B6] font-bold px-2 py-0.5 rounded-md bg-white/5">
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between text-xs text-white/50">
              <span className="text-[11px]">Toca cualquier plan para editarlo</span>
              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="px-3.5 py-1 text-xs font-semibold text-white/75 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
