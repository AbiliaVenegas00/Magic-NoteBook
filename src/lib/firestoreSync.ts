import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDoc,
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AssignmentTask, Goal, QuickNote } from '../types';

/**
 * Removes any properties with `undefined` values recursively
 * since Firestore throws an error when any field is `undefined`.
 */
function cleanUndefined<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = cleanUndefined(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? cleanUndefined(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// In-memory cache of deleted task IDs to prevent re-creation across devices
export const cachedDeletedTaskIds = new Set<string>();

/**
 * Subscribes to user metadata to keep deleted task IDs synchronized across devices.
 */
export function subscribeToUserMetadata(userId: string) {
  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(userDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.deletedTaskIds)) {
        data.deletedTaskIds.forEach((id: string) => cachedDeletedTaskIds.add(id));
      }
    }
  }, (err) => {
    console.warn('Notice subscribing to user metadata:', err);
  });
}

/**
 * Subscribes to user tasks in Firestore.
 */
export function subscribeToUserTasks(
  userId: string, 
  callback: (tasks: AssignmentTask[]) => void
) {
  const colRef = collection(db, 'users', userId, 'tasks');
  return onSnapshot(colRef, (snapshot) => {
    const tasks: AssignmentTask[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AssignmentTask;
      const taskId = docSnap.id;
      // Filter out any task that has been deleted
      if (!cachedDeletedTaskIds.has(taskId) && !(data as any).deleted) {
        tasks.push({ ...data, id: taskId });
      }
    });
    callback(tasks);
  }, (err) => {
    console.warn('Error subscribing to user tasks:', err);
  });
}

/**
 * Subscribes to user goals in Firestore.
 */
export function subscribeToUserGoals(
  userId: string, 
  callback: (goals: Goal[]) => void
) {
  const colRef = collection(db, 'users', userId, 'goals');
  return onSnapshot(colRef, (snapshot) => {
    const goals: Goal[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Goal;
      goals.push({ ...data, id: data.id || docSnap.id });
    });
    callback(goals);
  }, (err) => {
    console.warn('Error subscribing to user goals:', err);
  });
}

/**
 * Subscribes to user notes in Firestore.
 */
export function subscribeToUserNotes(
  userId: string, 
  callback: (notes: QuickNote[]) => void
) {
  const colRef = collection(db, 'users', userId, 'notes');
  return onSnapshot(colRef, (snapshot) => {
    const notes: QuickNote[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as QuickNote;
      notes.push({ ...data, id: data.id || docSnap.id });
    });
    callback(notes);
  }, (err) => {
    console.warn('Error subscribing to user notes:', err);
  });
}

/**
 * Syncs a single task to Firestore.
 */
export async function syncTaskToFirestore(userId: string, task: AssignmentTask) {
  try {
    // If this task was previously deleted, NEVER re-create it in Firestore
    if (cachedDeletedTaskIds.has(task.id)) {
      return;
    }
    const docRef = doc(db, 'users', userId, 'tasks', task.id);
    const sanitized = cleanUndefined({ ...task, userId });
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error('Failed to sync task to Firestore', err);
  }
}

/**
 * Deletes a task from Firestore and records it as deleted across all devices.
 */
export async function deleteTaskFromFirestore(userId: string, taskId: string) {
  try {
    cachedDeletedTaskIds.add(taskId);

    // Record deleted task ID on the user document in Firestore so all other devices receive the tombstone
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      deletedTaskIds: arrayUnion(taskId),
    }, { merge: true });

    // Delete the task document from the user's tasks subcollection
    const docRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete task from Firestore', err);
  }
}

/**
 * Records a deleted Google event ID so it will never be resurrected/re-imported.
 */
export async function recordDeletedGoogleEvent(userId: string, eventId: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      deletedGoogleEvents: arrayUnion(eventId)
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to record deleted google event in Firestore', err);
  }
}

/**
 * Fetches the set of Google event IDs deleted by this user.
 */
export async function getDeletedGoogleEvents(userId: string): Promise<Set<string>> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return new Set();
    }
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.deletedGoogleEvents)) {
      return new Set(snap.data().deletedGoogleEvents);
    }
  } catch (err: any) {
    if (!err?.message?.includes('offline') && err?.code !== 'unavailable') {
      console.warn('Failed to get deleted google events', err);
    }
  }
  return new Set();
}

/**
 * Syncs a single goal to Firestore.
 */
export async function syncGoalToFirestore(userId: string, goal: Goal) {
  try {
    const docRef = doc(db, 'users', userId, 'goals', goal.id);
    const sanitized = cleanUndefined({ ...goal, userId });
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error('Failed to sync goal to Firestore', err);
  }
}

/**
 * Deletes a goal from Firestore.
 */
export async function deleteGoalFromFirestore(userId: string, goalId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete goal from Firestore', err);
  }
}

/**
 * Syncs a single note to Firestore.
 */
export async function syncNoteToFirestore(userId: string, note: QuickNote) {
  try {
    const docRef = doc(db, 'users', userId, 'notes', note.id);
    const sanitized = cleanUndefined({ ...note, userId });
    await setDoc(docRef, sanitized);
  } catch (err) {
    console.error('Failed to sync note to Firestore', err);
  }
}

/**
 * Deletes a note from Firestore.
 */
export async function deleteNoteFromFirestore(userId: string, noteId: string) {
  try {
    const docRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete note from Firestore', err);
  }
}

/**
 * Initializes user cloud storage on FIRST-TIME account creation only.
 * If the user account has already been initialized, this will NEVER re-upload
 * local tasks, preventing deleted tasks on other devices from coming back.
 */
export async function initializeUserDataIfEmpty(
  userId: string,
  localTasks: AssignmentTask[],
  localGoals: Goal[],
  localNotes: QuickNote[]
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      // Check current auth user
      const { auth } = await import('./firebase');
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        return;
      }

      // Ensure token is resolved in client SDK
      try {
        await auth.currentUser.getIdToken();
      } catch {}

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      // If user account is already initialized in Firestore, NEVER re-seed or overwrite!
      // A 0-task collection means the user deleted their tasks intentionally.
      if (userDocSnap.exists() && userDocSnap.data()?.initialized) {
        return;
      }

      // Mark as initialized immediately
      await setDoc(userDocRef, { initialized: true, createdAt: new Date().toISOString() }, { merge: true });

      // Seed any local tasks missing from the cloud
      const tasksCol = collection(db, 'users', userId, 'tasks');
      const tasksSnap = await getDocs(tasksCol);

      if (localTasks.length > 0) {
        const existingCloudDocIds = new Set(tasksSnap.docs.map((d) => d.id));
        const unsynced = localTasks.filter((t) => !existingCloudDocIds.has(t.id) && !cachedDeletedTaskIds.has(t.id));
        if (unsynced.length > 0) {
          const batch = writeBatch(db);
          unsynced.forEach((task) => {
            const docRef = doc(db, 'users', userId, 'tasks', task.id);
            const sanitized = cleanUndefined({ ...task, userId });
            batch.set(docRef, sanitized);
          });
          await batch.commit();
        }
      }

      const goalsCol = collection(db, 'users', userId, 'goals');
      const goalsSnap = await getDocs(goalsCol);
      if (localGoals.length > 0) {
        const existingCloudDocIds = new Set(goalsSnap.docs.map((d) => d.id));
        const unsynced = localGoals.filter((g) => !existingCloudDocIds.has(g.id));
        if (unsynced.length > 0) {
          const batch = writeBatch(db);
          unsynced.forEach((goal) => {
            const docRef = doc(db, 'users', userId, 'goals', goal.id);
            const sanitized = cleanUndefined({ ...goal, userId });
            batch.set(docRef, sanitized);
          });
          await batch.commit();
        }
      }

      const notesCol = collection(db, 'users', userId, 'notes');
      const notesSnap = await getDocs(notesCol);
      if (localNotes.length > 0) {
        const existingCloudDocIds = new Set(notesSnap.docs.map((d) => d.id));
        const unsynced = localNotes.filter((n) => !existingCloudDocIds.has(n.id));
        if (unsynced.length > 0) {
          const batch = writeBatch(db);
          unsynced.forEach((note) => {
            const docRef = doc(db, 'users', userId, 'notes', note.id);
            const sanitized = cleanUndefined({ ...note, userId });
            batch.set(docRef, sanitized);
          });
          await batch.commit();
        }
      }
      return;
    } catch (err: any) {
      if (
        err?.message?.includes('offline') || 
        err?.message?.includes('client is offline') || 
        err?.code === 'unavailable' ||
        err?.code === 'failed-precondition'
      ) {
        // Offline mode: real-time listeners will handle sync automatically when back online
        return;
      }
      if (
        (err?.code === 'permission-denied' || err?.message?.includes('permissions')) &&
        attempt === 0
      ) {
        // Wait 500ms for auth state token propagation and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      console.warn('Initial cloud seed notice:', err?.message || err);
      return;
    }
  }
}
