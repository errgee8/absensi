import webpush from 'web-push';
import { db, getSetting, setSetting } from './db.js';
import { isSupabaseConfigured, cloudDb } from './supabase.js';

let vapidKeys = null;

/**
 * Initialize VAPID Keys from environment, DB settings, or generate fresh pair
 */
export async function initVapidKeys() {
  if (vapidKeys) return vapidKeys;

  // 1. Check process.env
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  } else {
    // 2. Check local DB / Supabase settings
    let saved = getSetting('vapid_keys');
    if (!saved && isSupabaseConfigured) {
      try {
        const supaSetting = await cloudDb.getSetting('vapid_keys');
        if (supaSetting) saved = supaSetting;
      } catch {}
    }

    if (saved && saved.publicKey && saved.privateKey) {
      vapidKeys = saved;
    } else {
      // 3. Generate a new permanent VAPID keypair
      vapidKeys = webpush.generateVAPIDKeys();
      setSetting('vapid_keys', vapidKeys);
      if (isSupabaseConfigured) {
        try {
          await cloudDb.saveSetting('vapid_keys', vapidKeys);
        } catch {}
      }
      console.log('Generated fresh permanent VAPID keypair for PWA Push Notifications.');
    }
  }

  webpush.setVapidDetails(
    'mailto:management@jplc.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  return vapidKeys;
}

/**
 * Get VAPID Public Key for client subscription
 */
export async function getVapidPublicKey() {
  const keys = await initVapidKeys();
  return keys.publicKey;
}

/**
 * Initialize push_subscriptions table
 */
export function initPushTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_push_staff_id ON push_subscriptions(staff_id);
  `);
}

/**
 * Save or update staff push subscription
 */
export async function savePushSubscription({ staffId, subscription, userAgent }) {
  if (!staffId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Data langganan push notification tidak lengkap.');
  }

  initPushTables();

  const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;
  const now = new Date().toISOString();

  // Save to SQLite
  db.prepare(`
    INSERT INTO push_subscriptions (id, staff_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      staff_id = excluded.staff_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at
  `).run(id, String(staffId), endpoint, p256dh, auth, userAgent || '', now);

  // Sync to Supabase Cloud if configured
  if (isSupabaseConfigured) {
    try {
      const existing = (await cloudDb.getSetting('push_subscriptions')) || [];
      const filtered = existing.filter(s => s.endpoint !== endpoint);
      filtered.push({
        id,
        staff_id: String(staffId),
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent || '',
        updated_at: now
      });
      await cloudDb.saveSetting('push_subscriptions', filtered);
    } catch (e) {
      console.warn('Supabase push subscription sync warning:', e.message);
    }
  }

  return { success: true, message: 'Langganan notifikasi push berhasil disimpan.' };
}

/**
 * Get all subscriptions for a specific staffId or all staff
 */
export async function getSubscriptions(staffId = null) {
  initPushTables();
  let list = [];

  if (isSupabaseConfigured) {
    try {
      const supaList = (await cloudDb.getSetting('push_subscriptions')) || [];
      if (Array.isArray(supaList) && supaList.length > 0) {
        list = supaList;
      }
    } catch {}
  }

  if (list.length === 0) {
    list = db.prepare('SELECT * FROM push_subscriptions').all();
  }

  if (staffId && staffId !== 'ALL') {
    list = list.filter(s => String(s.staff_id) === String(staffId));
  }

  return list;
}

/**
 * Remove dead subscription endpoint (HTTP 410 or 404)
 */
export async function removeSubscription(endpoint) {
  try {
    initPushTables();
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);

    if (isSupabaseConfigured) {
      const existing = (await cloudDb.getSetting('push_subscriptions')) || [];
      const updated = existing.filter(s => s.endpoint !== endpoint);
      await cloudDb.saveSetting('push_subscriptions', updated);
    }
  } catch (e) {
    console.warn('Failed to remove expired subscription:', e.message);
  }
}

/**
 * Send push notification to target staff or broadcast
 * @param {Object} options
 * @param {string|string[]} options.staffIds - Single ID, array of IDs, or 'ALL'
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body message
 * @param {string} [options.url] - Target click URL
 * @param {string} [options.tag] - Notification group tag
 * @param {string} [options.icon] - Icon URL
 */
export async function sendPushNotification({ staffIds, title, body, url = '/', tag = 'jplc-notification', icon = '/favicon.svg' }) {
  await initVapidKeys();

  let targetList = [];
  if (!staffIds || staffIds === 'ALL') {
    targetList = await getSubscriptions();
  } else if (Array.isArray(staffIds)) {
    const allSubs = await getSubscriptions();
    const strIds = staffIds.map(String);
    targetList = allSubs.filter(s => strIds.includes(String(s.staff_id)));
  } else {
    targetList = await getSubscriptions(staffIds);
  }

  if (!targetList || targetList.length === 0) {
    return { sentCount: 0, message: 'Tidak ada perangkat terdaftar untuk menerima notifikasi ini.' };
  }

  const payload = JSON.stringify({
    title,
    body,
    icon,
    badge: '/favicon.svg',
    url,
    tag,
    vibrate: [200, 100, 200, 100, 200], // Getar ritme pesan WhatsApp
    timestamp: Date.now()
  });

  let sentCount = 0;
  const sendPromises = targetList.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sentCount++;
    } catch (err) {
      // 404 or 410 means subscription is expired or unregistered by the device
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(sub.endpoint);
      } else {
        console.warn(`Error sending push to ${sub.staff_id}:`, err.message);
      }
    }
  });

  await Promise.allSettled(sendPromises);
  return { sentCount, totalTargets: targetList.length };
}
