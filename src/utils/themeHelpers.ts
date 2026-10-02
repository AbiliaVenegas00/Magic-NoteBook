import { PriorityLevel, TaskStatus, CategoryType } from '../types';

export const CALENDAR_PRIORITIES: PriorityLevel[] = ['high', 'medium', 'low'];

export const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string; borderClass: string }
> = {
  high: {
    label: 'Alta',
    shortLabel: 'Alta',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-500',
    borderClass: 'border-l-rose-500',
  },
  medium: {
    label: 'Media',
    shortLabel: 'Media',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    dotClass: 'bg-amber-400',
    borderClass: 'border-l-amber-400',
  },
  low: {
    label: 'Baja',
    shortLabel: 'Baja',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
  },
  // Aliases for backwards compatibility with any existing saved tasks
  urgent_important: {
    label: 'Alta',
    shortLabel: 'Alta',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-500',
    borderClass: 'border-l-rose-500',
  },
  important: {
    label: 'Media',
    shortLabel: 'Media',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    dotClass: 'bg-amber-400',
    borderClass: 'border-l-amber-400',
  },
  urgent: {
    label: 'Media',
    shortLabel: 'Media',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    dotClass: 'bg-amber-400',
    borderClass: 'border-l-amber-400',
  },
  routine: {
    label: 'Baja',
    shortLabel: 'Baja',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; pillClass: string; textClass: string; borderClass: string }
> = {
  todo: {
    label: 'Por hacer',
    pillClass: 'bg-[#191923] text-[#FFE8EF] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
    borderClass: 'border-[#2E0E32]',
  },
  in_progress: {
    label: 'En progreso',
    pillClass: 'bg-[#2E0E32]/70 text-[#FF99AA] border-[#A13653]/60',
    textClass: 'text-[#FF99AA]',
    borderClass: 'border-[#A13653]/60',
  },
  waiting: {
    label: 'En espera',
    pillClass: 'bg-[#191923] text-[#FFB0CC] border-[#FFB0CC]/30',
    textClass: 'text-[#FFB0CC]',
    borderClass: 'border-[#FFB0CC]/40',
  },
  completed: {
    label: 'Completado',
    pillClass: 'bg-[#12121C] text-emerald-300 border-emerald-800/40',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-600/40',
  },
};

export const CATEGORY_CONFIG: Record<
  CategoryType,
  { label: string; iconName: string; bgClass: string; textClass: string }
> = {
  academic: {
    label: 'Académico / Estudio',
    iconName: 'GraduationCap',
    bgClass: 'bg-[#191923] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
  },
  project: {
    label: 'Proyecto / Trabajo',
    iconName: 'Briefcase',
    bgClass: 'bg-[#191923] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
  },
  meeting: {
    label: 'Reunión / Sync',
    iconName: 'Users',
    bgClass: 'bg-[#191923] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
  },
  personal: {
    label: 'Personal y Vida',
    iconName: 'Sparkles',
    bgClass: 'bg-[#191923] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
  },
  review: {
    label: 'Revisión y Enfoque',
    iconName: 'BookOpen',
    bgClass: 'bg-[#191923] border-[#2E0E32]',
    textClass: 'text-[#FFE8EF]',
  },
};

