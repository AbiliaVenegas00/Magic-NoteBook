export type PriorityLevel = 'high' | 'medium' | 'low' | 'urgent_important' | 'important' | 'urgent' | 'routine';
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed';
export type CategoryType = 'academic' | 'project' | 'meeting' | 'personal' | 'review';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface CRMContact {
  id: string;
  name: string;
  role: string; // e.g. "Professor", "Project Lead", "Client", "Study Partner", "Advisor"
  organization?: string; // e.g. "CS Dept", "Acme Labs", "Design Studio"
  email?: string;
  phone?: string;
  relationship: 'academic' | 'work' | 'personal' | 'mentor' | 'client';
  notes?: string;
  color: string; // Hex or tailwind color class
  avatarInitials: string;
  lastContactDate?: string; // YYYY-MM-DD
}

export interface AssignmentTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (24-hour)
  durationMinutes: number; // e.g. 60 min, 120 min
  status: TaskStatus;
  priority: PriorityLevel;
  category: CategoryType;
  contactId?: string; // Links to CRMContact
  subtasks: Subtask[];
  followUpNote?: string;
  isFollowUpRequired?: boolean;
  completedAt?: string;
  createdAt: string;
  googleEventId?: string;
  syncedWithGoogle?: boolean;
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'board';
export type MainViewSection = 'calendar' | 'goals' | 'notes';
export type GoalPriority = 'high' | 'medium' | 'low';

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  color?: string; // hex or background accent
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface GoalTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  priority?: PriorityLevel | GoalPriority;
  isPinned?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDays?: number; // e.g. 30 days
  targetDate?: string; // YYYY-MM-DD
  targetCount?: number; // e.g. 20 tasks
  createdAt: string;
  color?: string;
  tasks: GoalTask[];
  isPinned?: boolean;
}

export interface FilterOptions {
  search: string;
  contactId: string | 'all';
  category?: CategoryType | 'all';
  priority: PriorityLevel | 'all';
  status: TaskStatus | 'all';
}
