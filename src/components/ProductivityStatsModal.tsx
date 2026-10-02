import React from 'react';
import { X, BarChart2, Clock, CheckCircle2 } from 'lucide-react';
import { AssignmentTask } from '../types';
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from '../utils/themeHelpers';

interface ProductivityStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: AssignmentTask[];
}

export const ProductivityStatsModal: React.FC<ProductivityStatsModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  if (!isOpen) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const activeTasks = tasks.filter((t) => t.status !== 'completed');

  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const completedMinutes = completedTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const activeMinutes = activeTasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const minutesByCategory = new Map<string, number>();
  for (const t of tasks) {
    minutesByCategory.set(t.category, (minutesByCategory.get(t.category) || 0) + t.durationMinutes);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative bg-[#161625]/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.4)] ring-1 ring-white/10 w-full max-w-lg flex flex-col overflow-hidden text-[#FFE8EF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular hairline top glow */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-20" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-[#FF99AA]/10 rounded-full blur-2xl z-0" aria-hidden="true" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-[#FF99AA] shadow-sm">
              <BarChart2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Estadísticas de Productividad
              </h3>
              <p className="text-[11px] text-[#FFB0CC]/70 font-medium">
                Métricas de tiempo, avance y distribución
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#FFE8EF]/70 hover:text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs relative z-10">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl shadow-xs">
              <span className="text-xl font-extrabold text-[#FF99AA] font-mono tabular-nums">{completionRate}%</span>
              <p className="text-[10px] text-[#FFE8EF]/60 font-semibold uppercase tracking-wider mt-1">Completado</p>
            </div>
            <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl shadow-xs">
              <span className="text-xl font-extrabold text-white font-mono tabular-nums">{(totalMinutes / 60).toFixed(1)}h</span>
              <p className="text-[10px] text-[#FFE8EF]/60 font-semibold uppercase tracking-wider mt-1">Tiempo total</p>
            </div>
            <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl shadow-xs">
              <span className="text-xl font-extrabold text-emerald-300 font-mono tabular-nums">{(completedMinutes / 60).toFixed(1)}h</span>
              <p className="text-[10px] text-[#FFE8EF]/60 font-semibold uppercase tracking-wider mt-1">Finalizado</p>
            </div>
            <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl shadow-xs">
              <span className="text-xl font-extrabold text-[#FFB0CC] font-mono tabular-nums">{(activeMinutes / 60).toFixed(1)}h</span>
              <p className="text-[10px] text-[#FFE8EF]/60 font-semibold uppercase tracking-wider mt-1">Pendiente</p>
            </div>
          </div>

          {/* Categorías */}
          <div className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]">
            <h4 className="font-extrabold text-white mb-3 flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#FF99AA]" />
              <span>Tiempo invertido por categoría</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const mins = minutesByCategory.get(key) || 0;
                const hours = (mins / 60).toFixed(1);
                const count = tasks.filter((t) => t.category === key).length;

                return (
                  <div key={key} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] flex items-center justify-between transition-colors">
                    <div>
                      <span className="font-bold text-[#FFE8EF] text-[11px] block">{cfg.label}</span>
                      <p className="text-[10px] text-[#FFE8EF]/50 font-medium">{count} {count === 1 ? 'plan' : 'planes'}</p>
                    </div>
                    <span className="font-mono font-bold text-[#FFB0CC] text-xs tabular-nums">{hours}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 flex justify-end relative z-10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-[#FF6688] to-[#FF99AA] hover:from-[#FF7A99] hover:to-[#FFB0CC] text-[#0F0F1A] rounded-xl transition-all shadow-md shadow-[#FF6688]/30 active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

