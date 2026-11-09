const DB_NAME = 'jplc_offline_db';
const STORE_NAME = 'pending_requests';
const DB_VERSION = 1;

/**
 * Open or upgrade the local IndexedDB database for offline resilience
 */
export function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung oleh browser ini.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a pending checkin/checkout/inspection payload into local IndexedDB
 */
export async function enqueueOfflineAction({ url, method = 'POST', payload, staffName, actionType = 'ABSENSI' }) {
  const db = await openOfflineDb();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record = {
    id,
    url,
    method,
    payload,
    staffName: staffName || 'Staff',
    actionType,
    captured_at: new Date().toISOString(),
    retry_count: 0
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all pending offline records
 */
export async function getOfflineQueue() {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Remove an offline record by ID once synced
 */
export async function removeOfflineAction(id) {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/**
 * Automatically syncs any queued offline attendance / inspection punches when internet reconnects
 */
export async function syncOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, pending: 0 };
  }

  const queue = await getOfflineQueue();
  if (!queue || queue.length === 0) {
    return { synced: 0, pending: 0 };
  }

  let syncedCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Synced': 'true',
          'X-Offline-Captured-At': item.captured_at
        },
        body: JSON.stringify(item.payload)
      });

      // Status 200 (Success) or 400 with "sudah memiliki shift / sudah tercatat" (duplicate safety)
      if (res.ok) {
        await removeOfflineAction(item.id);
        syncedCount++;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error && errData.error.includes('sudah memiliki shift')) {
          await removeOfflineAction(item.id);
          syncedCount++;
        }
      }
    } catch (err) {
      console.warn(`Retry failed for offline item ${item.id}:`, err.message);
    }
  }

  if (syncedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-synced', { detail: { syncedCount } }));
  }

  return { synced: syncedCount, remaining: queue.length - syncedCount };
}

// Auto-listen to network reconnect events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue();
  });
}
