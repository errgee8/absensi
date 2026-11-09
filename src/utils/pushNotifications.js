const API_BASE = '/api';

/**
 * Check if the browser / platform supports Web Push Notifications
 */
export function isPushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window;
}

/**
 * Get current notification permission
 * @returns {'default' | 'granted' | 'denied' | 'unsupported'}
 */
export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Convert VAPID public key base64 URL safe string to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission, register service worker push subscription, and send to backend
 */
export async function subscribeStaffToPush(staffId) {
  if (!isPushSupported()) {
    throw new Error('Browser atau perangkat ini belum mendukung fitur Push Notification.');
  }

  // 1. Request permission from browser
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Izin notifikasi diblokir oleh browser. Harap izinkan notifikasi di pengaturan browser Anda.'
        : 'Izin notifikasi belum diberikan.'
    );
  }

  // 2. Register Service Worker if not yet registered
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }
  await navigator.serviceWorker.ready;

  // 3. Fetch VAPID Public Key from server
  const keyRes = await fetch(`${API_BASE}/push/vapid-key`);
  if (!keyRes.ok) {
    throw new Error('Gagal memuat kunci enkripsi notifikasi dari server.');
  }
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error('Kunci publik VAPID tidak tersedia.');
  }

  // 4. Check existing or create new push subscription
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const convertedKey = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });
  }

  // 5. Send subscription to server
  const subRes = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staffId: String(staffId),
      subscription: sub.toJSON(),
      userAgent: navigator.userAgent
    })
  });

  if (!subRes.ok) {
    const errData = await subRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal menyimpan langganan notifikasi di server.');
  }

  // 6. Send immediate test notification
  try {
    await fetch(`${API_BASE}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: String(staffId) })
    });
  } catch (e) {
    console.warn('Test notification note:', e);
  }

  return { success: true };
}
