// Utility functions for dates and calendars

export function getTodayDateString(): string {
  // Returns current date in YYYY-MM-DD format
  const now = new Date();
  return formatDateToISO(now);
}

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatHumanDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthDaysGrid(year: number, month: number): { date: Date; dateStr: string; isCurrentMonth: boolean }[] {
  // month is 0-indexed (0 = Jan, 8 = Sep)
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date: prevDate,
      dateStr: formatDateToISO(prevDate),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const currDate = new Date(year, month, day);
    days.push({
      date: currDate,
      dateStr: formatDateToISO(currDate),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete full weeks (multiple of 7)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        dateStr: formatDateToISO(nextDate),
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

export function getWeekDays(anchorDate: Date): { date: Date; dateStr: string; isToday: boolean }[] {
  const curr = new Date(anchorDate);
  const dayOfWeek = curr.getDay(); // 0 is Sunday
  
  // Calculate Sunday of current week
  const sunday = new Date(curr);
  sunday.setDate(curr.getDate() - dayOfWeek);

  const todayStr = getTodayDateString();
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = formatDateToISO(d);
    weekDays.push({
      date: d,
      dateStr,
      isToday: dateStr === todayStr,
    });
  }

  return weekDays;
}

export function isOverdue(dueDateStr: string, status: string): boolean {
  if (status === 'completed') return false;
  const today = getTodayDateString();
  return dueDateStr < today;
}

export function isDueToday(dueDateStr: string): boolean {
  return dueDateStr === getTodayDateString();
}

export function formatTimeSlot(timeStr?: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function addDays(dateStr: string, daysToAdd: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + daysToAdd);
  return formatDateToISO(d);
}
