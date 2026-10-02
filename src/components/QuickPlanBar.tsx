import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AssignmentTask, PriorityLevel, CategoryType } from '../types';
import { getTodayDateString, addDays, formatDateToISO } from '../utils/dateUtils';

interface QuickPlanBarProps {
  onAddTask: (task: Omit<AssignmentTask, 'id' | 'createdAt'>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPlanBar: React.FC<QuickPlanBarProps> = ({
  onAddTask,
  isOpen,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [previewPlan, setPreviewPlan] = useState<{
    title: string;
    dueDate: string;
    dueTime: string;
    durationMinutes: number;
    category: CategoryType;
    priority: PriorityLevel;
  } | null>(null);

  if (!isOpen) return null;

  const parsePlanInput = (text: string) => {
    if (!text.trim()) {
      setPreviewPlan(null);
      return;
    }

    const todayStr = getTodayDateString();
    let targetDate = todayStr;
    let targetTime = '10:00';
    let duration = 60;
    let category: CategoryType = 'personal';
    let priority: PriorityLevel = 'important';

    const lower = text.toLowerCase();

    // Check date keywords (Spanish + English)
    if (lower.includes('hoy') || lower.includes('today')) {
      targetDate = todayStr;
    } else if (lower.includes('mañana') || lower.includes('tomorrow')) {
      targetDate = addDays(todayStr, 1);
    } else if (lower.includes('pasado mañana') || lower.includes('in 2 days')) {
      targetDate = addDays(todayStr, 2);
    } else if (lower.includes('viernes') || lower.includes('friday')) {
      const today = new Date();
      const currentDay = today.getDay();
      let daysUntil = (5 - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      targetDate = formatDateToISO(new Date(today.getTime() + daysUntil * 86400000));
    } else if (lower.includes('lunes') || lower.includes('monday')) {
      const today = new Date();
      const currentDay = today.getDay();
      let daysUntil = (1 - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      targetDate = formatDateToISO(new Date(today.getTime() + daysUntil * 86400000));
    }

    // Check time keywords
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch && (lower.includes('am') || lower.includes('pm') || lower.includes(':') || lower.includes(' a las ') || lower.includes('at '))) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? timeMatch[2] : '00';
      const meridian = timeMatch[3];
      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;
      targetTime = `${String(hour).padStart(2, '0')}:${min}`;
    }

    // Check duration
    const hourMatch = lower.match(/(\d+)\s*(?:h|hr|hora|horas)/);
    const minMatch = lower.match(/(\d+)\s*(?:m|min|mins|minuto|minutos)/);
    if (hourMatch) {
      duration = parseInt(hourMatch[1], 10) * 60;
    } else if (minMatch) {
      duration = parseInt(minMatch[1], 10);
    }

    // Priority
    if (lower.includes('urgente') || lower.includes('urgent') || lower.includes('asap') || lower.includes('p1')) {
      priority = 'urgent_important';
    } else if (lower.includes('rutina') || lower.includes('baja') || lower.includes('low')) {
      priority = 'routine';
    }

    // Clean title
    let cleanTitle = text
      .replace(/(?:hoy|mañana|pasado mañana|viernes|lunes|today|tomorrow)/gi, '')
      .replace(/(?:a las|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
      .replace(/\d+\s*(?:h|hr|hora|horas|m|min|mins|minuto|minutos)/gi, '')
      .trim();

    if (!cleanTitle) cleanTitle = text.trim();

    setPreviewPlan({
      title: cleanTitle,
      dueDate: targetDate,
      dueTime: targetTime,
      durationMinutes: duration,
      category,
      priority,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    parsePlanInput(val);
  };

  const handleCommitPlan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!previewPlan || !previewPlan.title) return;

    onAddTask({
      title: previewPlan.title,
      description: undefined,
      dueDate: previewPlan.dueDate,
      dueTime: previewPlan.dueTime,
      durationMinutes: previewPlan.durationMinutes,
      status: 'todo',
      priority: previewPlan.priority,
      category: previewPlan.category,
      subtasks: [],
    });

    setInputText('');
    setPreviewPlan(null);
    onClose();
  };

  const applyPreset = (presetText: string) => {
    setInputText(presetText);
    parsePlanInput(presetText);
  };

  return (
    <div className="bg-[#12121E]/95 text-[#FFE8EF] px-4 py-3 border-b border-white/10 backdrop-blur-2xl shadow-lg relative z-25 animate-in slide-in-from-top-2 duration-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-[#FFB0CC] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#FF99AA] animate-pulse" />
            <span>Creación Rápida con Lenguaje Natural</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#FFE8EF]/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCommitPlan} className="flex items-center gap-2 mb-2">
          <input
            id="input-quick-plan-text"
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Ej. Revisar informe mañana a las 11:00 45m urgente"
            className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/15 rounded-2xl px-4 py-2 text-xs text-white placeholder-[#FFE8EF]/40 focus:outline-hidden focus:border-[#FF99AA] focus:ring-1 focus:ring-[#FF99AA] transition-all font-medium"
            autoFocus
          />
          <button
            type="submit"
            disabled={!previewPlan || !previewPlan.title}
            className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-[#FF6688] to-[#FF99AA] hover:from-[#FF7A99] hover:to-[#FFB0CC] text-[#0F0F1A] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-[#FF6688]/30 active:scale-95"
          >
            <span>Crear</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>

        {/* Preview */}
        {previewPlan && previewPlan.title && (
          <div className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 mb-2 text-xs flex flex-wrap items-center gap-3">
            <span className="text-[#FFB0CC] text-[11px] font-bold">Interpretado:</span>
            <span className="font-bold text-white">{previewPlan.title}</span>
            <span className="text-[#FFE8EF]/80 text-[11px] flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3 text-[#FF99AA]" />
              {previewPlan.dueDate}
            </span>
            <span className="text-[#FFE8EF]/80 text-[11px] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-[#FF99AA]" />
              {previewPlan.dueTime} ({previewPlan.durationMinutes}m)
            </span>
          </div>
        )}

        {/* Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#FFE8EF]/60">
          <span className="font-semibold text-[#FFB0CC]/80">Ejemplos rápidos:</span>
          <button
            type="button"
            onClick={() => applyPreset('Estudiar mañana a las 10:00 60m urgente')}
            className="text-[#FF99AA] hover:text-white underline decoration-dotted transition-colors"
          >
            Estudiar mañana 10:00
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => applyPreset('Planificar semana viernes a las 16:00 30m')}
            className="text-[#FF99AA] hover:text-white underline decoration-dotted transition-colors"
          >
            Planificar viernes 16:00
          </button>
        </div>

      </div>
    </div>
  );
};

