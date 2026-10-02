import { AssignmentTask } from '../types';

interface GoogleCalendarEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  status?: string;
  htmlLink?: string;
}

/**
 * Builds Google Calendar start & end payload from an AssignmentTask.
 */
function buildEventTimes(task: AssignmentTask) {
  if (task.dueTime) {
    const startDateTime = `${task.dueDate}T${task.dueTime}:00`;
    const startDate = new Date(startDateTime);
    const duration = task.durationMinutes || 60;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    
    const endHour = String(endDate.getHours()).padStart(2, '0');
    const endMin = String(endDate.getMinutes()).padStart(2, '0');
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endDateTime = `${endYear}-${endMonth}-${endDay}T${endHour}:${endMin}:00`;

    return {
      start: { dateTime: new Date(startDateTime).toISOString() },
      end: { dateTime: new Date(endDateTime).toISOString() },
    };
  }

  // All-day event
  return {
    start: { date: task.dueDate },
    end: { date: task.dueDate },
  };
}

/**
 * Fetches events from primary Google Calendar.
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  
  if (timeMin) url.searchParams.set('timeMin', timeMin);
  if (timeMax) url.searchParams.set('timeMax', timeMax);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
}

/**
 * Creates an event in Google Calendar from an app plan.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  task: AssignmentTask
): Promise<GoogleCalendarEvent> {
  const times = buildEventTimes(task);
  const payload = {
    summary: task.title,
    description: task.description || undefined,
    ...times,
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to create Google Calendar event: ${errorBody}`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Updates an event in Google Calendar.
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  task: AssignmentTask
): Promise<GoogleCalendarEvent> {
  const times = buildEventTimes(task);
  const payload = {
    summary: task.title,
    description: task.description || undefined,
    ...times,
  };

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to update Google Calendar event: ${errorBody}`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const errorBody = await res.text();
      console.warn(`Failed to delete Google Calendar event: ${errorBody}`);
    }
  } catch (err) {
    console.warn(`Network error deleting Google Calendar event:`, err);
  }
}

/**
 * Full bidirectional synchronization:
 * 1. Pulls Google Calendar events and adds any missing ones to the app.
 *    (Ignores any events in deletedGoogleEventIds).
 * 2. Pushes local tasks that are flagged for Google Calendar.
 */
export async function syncPlansWithGoogleCalendar(
  accessToken: string,
  existingTasks: AssignmentTask[],
  deletedGoogleEventIds: Set<string> = new Set()
): Promise<{
  mergedTasks: AssignmentTask[];
  importedCount: number;
  exportedCount: number;
}> {
  // Define 3-month window (30 days ago to 90 days ahead)
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch Google Calendar events
  const googleEvents = await listGoogleCalendarEvents(accessToken, timeMin, timeMax);

  let importedCount = 0;
  let exportedCount = 0;
  const updatedTasks = [...existingTasks];
  const googleEventIdMap = new Map<string, AssignmentTask>();

  updatedTasks.forEach((t) => {
    if (t.googleEventId) {
      googleEventIdMap.set(t.googleEventId, t);
    }
  });

  // 2. Import events from Google Calendar that are not yet in our app
  for (const gEvent of googleEvents) {
    if (gEvent.status === 'cancelled') continue;
    if (!gEvent.summary) continue;

    // Check if this event was previously deleted by the user
    if (deletedGoogleEventIds.has(gEvent.id)) {
      // Also delete from Google Calendar to keep remote calendar clean
      deleteGoogleCalendarEvent(accessToken, gEvent.id).catch(() => {});
      continue;
    }

    // Check if we already have this event by ID
    const existing = googleEventIdMap.get(gEvent.id);
    if (!existing) {
      // Determine date and time
      let dueDate = '';
      let dueTime: string | undefined = undefined;
      let durationMinutes = 60;

      if (gEvent.start?.dateTime) {
        const startDate = new Date(gEvent.start.dateTime);
        dueDate = startDate.toISOString().slice(0, 10);
        dueTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

        if (gEvent.end?.dateTime) {
          const endDate = new Date(gEvent.end.dateTime);
          const diffMs = endDate.getTime() - startDate.getTime();
          if (diffMs > 0) {
            durationMinutes = Math.round(diffMs / (60 * 1000));
          }
        }
      } else if (gEvent.start?.date) {
        dueDate = gEvent.start.date;
      }

      if (dueDate) {
        const newTask: AssignmentTask = {
          id: `task-gcal-${gEvent.id}`,
          title: gEvent.summary,
          description: gEvent.description || undefined,
          dueDate,
          dueTime,
          durationMinutes,
          status: 'todo',
          priority: 'important',
          category: 'personal',
          subtasks: [],
          createdAt: new Date().toISOString(),
          googleEventId: gEvent.id,
          syncedWithGoogle: true,
        };

        updatedTasks.unshift(newTask);
        googleEventIdMap.set(gEvent.id, newTask);
        importedCount++;
      }
    }
  }

  // 3. Export local tasks to Google Calendar if they don't have a googleEventId yet
  for (let i = 0; i < updatedTasks.length; i++) {
    const task = updatedTasks[i];
    // Only export if task is marked syncedWithGoogle and has dueDate
    if (task.syncedWithGoogle && !task.googleEventId && task.dueDate) {
      try {
        const created = await createGoogleCalendarEvent(accessToken, task);
        if (created?.id) {
          updatedTasks[i] = {
            ...task,
            googleEventId: created.id,
            syncedWithGoogle: true,
          };
          exportedCount++;
        }
      } catch (err) {
        console.warn(`Failed to export task "${task.title}" to Google Calendar:`, err);
      }
    }
  }

  return {
    mergedTasks: updatedTasks,
    importedCount,
    exportedCount,
  };
}
