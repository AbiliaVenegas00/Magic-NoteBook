import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Trash2, 
  Copy,
  AlertTriangle
} from 'lucide-react';
import { AssignmentTask, PriorityLevel, TaskStatus } from '../types';
import { PRIORITY_CONFIG, STATUS_CONFIG, CALENDAR_PRIORITIES } from '../utils/themeHelpers';
import { getTodayDateString } from '../utils/dateUtils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AssignmentTask | null; // If null, mode is create
  initialDate?: string;
  initialTime?: string;
  initialStatus?: TaskStatus;
  initialPriority?: PriorityLevel;
  onSaveTask: (taskData: Omit<AssignmentTask, 'id' | 'createdAt'>, taskId?: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (task: AssignmentTask) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  initialDate,
  initialTime,
  initialStatus,
  initialPriority,
  onSaveTask,
  onDeleteTask,
  onDuplicateTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<PriorityLevel>('important');
  const [syncedWithGoogle, setSyncedWithGoogle] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '10:00');
      setDurationMinutes(task.durationMinutes || 60);
      setStatus(task.status);
      setPriority(task.priority);
      setSyncedWithGoogle(task.syncedWithGoogle !== false);
    } else {
      // Default creation state
      setTitle('');
      setDescription('');
      setDueDate(initialDate || getTodayDateString());
      setDueTime(initialTime || '10:00');
      setDurationMinutes(60);
      setStatus(initialStatus || 'todo');
      setPriority(initialPriority || 'important');
      setSyncedWithGoogle(true);
    }
  }, [task, initialDate, initialTime, initialStatus, initialPriority, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime: dueTime || undefined,
        durationMinutes,
        status,
        priority,
        category: task?.category || 'personal',
        subtasks: task?.subtasks || [],
        completedAt: status === 'completed' ? task?.completedAt || new Date().toISOString() : undefined,
        googleEventId: task?.googleEventId,
        syncedWithGoogle,
      },
      task?.id
    );

    onClose();
  };

  const handleConfirmDelete = () => {
    if (task && onDeleteTask) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative bg-[#242424] border border-[#5C464B]/60 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden text-[#FFE8EF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Fixed at top) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#5C464B]/40 bg-[#1F1F1F] flex items-center justify-between relative z-10">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              {task ? 'Editar plan' : 'Crear nuevo plan'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#E5A0B6] font-medium truncate">
              {task ? 'Actualiza los detalles y horarios' : 'Agenda un nuevo compromiso o actividad'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {task && onDuplicateTask && (
              <button
                type="button"
                onClick={() => {
                  onDuplicateTask(task);
                  onClose();
                }}
                className="p-1.5 sm:p-2 rounded-xl text-[#FFD1DB] hover:text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95 shadow-xs"
                title="Duplicar plan"
              >
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {task && onDeleteTask && (
              <button
                type="button"
                id="btn-header-delete-task"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={`p-1.5 sm:p-2 rounded-xl transition-all border active:scale-95 shadow-xs ${
                  showDeleteConfirm
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'text-[#FF688B] hover:text-white hover:bg-[#FF688B]/20 border-white/10'
                }`}
                title="Eliminar plan"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Modal Delete Confirmation Banner */}
        {showDeleteConfirm && (
          <div className="bg-rose-950/70 border-b border-rose-500/40 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>¿Eliminar este plan del calendario?</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-action"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        )}

        {/* Modal Form with Scrollable Fields and Pinned Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs bg-transparent">
            {/* Plan Title */}
            <div>
              <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1.5">
                Título del Plan *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Ejercicio matutino o Revisión de proyecto"
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl sm:rounded-2xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B] transition-all font-semibold"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1.5">
                Descripción u Observaciones (Opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales, notas del plan..."
                className="w-full px-3.5 sm:px-4 py-2 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl sm:rounded-2xl text-xs text-white placeholder-white/40 focus:outline-hidden focus:border-[#FF688B] transition-all leading-relaxed font-medium resize-none"
              />
            </div>

            {/* Date, Time & Duration row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#FF688B]" />
                    <span>Fecha</span>
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl sm:rounded-2xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] transition-all font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF688B]" />
                    <span>Hora</span>
                  </span>
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl sm:rounded-2xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] transition-all font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1">
                  Duración
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1F1F1F] border border-[#5C464B]/60 rounded-xl sm:rounded-2xl text-xs text-white focus:outline-hidden focus:border-[#FF688B] transition-all font-medium"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>

            {/* Segmented Priority Control (Alta, Media, Baja) */}
            <div>
              <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1.5">
                Nivel de Prioridad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CALENDAR_PRIORITIES.map((pKey) => {
                  const cfg = PRIORITY_CONFIG[pKey];
                  const isSelected = 
                    priority === pKey ||
                    (pKey === 'high' && priority === 'urgent_important') ||
                    (pKey === 'medium' && (priority === 'important' || priority === 'urgent')) ||
                    (pKey === 'low' && priority === 'routine');

                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPriority(pKey)}
                      className={`px-2.5 py-1.5 sm:py-2 rounded-xl text-center flex items-center justify-center gap-1.5 sm:gap-2 border transition-all text-xs font-bold ${
                        isSelected
                          ? `${cfg.badgeClass} ring-2 ring-white/40 shadow-sm scale-[1.02]`
                          : 'bg-[#1F1F1F] hover:bg-[#2c2c2c] border-[#5C464B]/50 text-white/75'
                      }`}
                    >
                      <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 shadow-xs ${cfg.dotClass}`} />
                      <span className="font-bold text-xs">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Segmented Status Control */}
            <div>
              <label className="block text-[11px] font-bold text-[#FFE8EF]/90 uppercase tracking-wider mb-1.5">
                Estado del Plan (Tablero)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((sKey) => {
                  const sCfg = STATUS_CONFIG[sKey];
                  const isSelected = status === sKey;
                  return (
                    <button
                      key={sKey}
                      type="button"
                      onClick={() => setStatus(sKey)}
                      className={`px-2 py-1.5 rounded-xl text-center border transition-all text-xs font-semibold ${
                        isSelected
                          ? 'bg-[#FFD1DB] text-[#1F1F1F] border-[#FFD1DB] shadow-sm font-bold'
                          : 'bg-[#1F1F1F] hover:bg-[#2c2c2c] border-[#5C464B]/50 text-white/75'
                      }`}
                    >
                      {sCfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pinned Sticky Footer - ALWAYS visible on screen, even on small phones! */}
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[#5C464B]/50 bg-[#1F1F1F] flex items-center justify-between gap-2.5 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
            <div>
              {task && onDeleteTask && (
                <button
                  type="button"
                  id="btn-footer-delete-task"
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-full transition-all border border-rose-500/30 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar plan</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 sm:px-6 py-2 sm:py-2.5 text-xs font-extrabold bg-[#FF688B] hover:bg-[#ff7a9b] text-white rounded-full transition-all shadow-md shadow-[#FF688B]/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                {task ? 'Guardar cambios' : 'Crear plan'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
