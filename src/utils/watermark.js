import { formatWitaDateTime, getAppNow } from './time.js';

/**
 * Universal Photo Timestamp Watermarking Engine
 * Burns tamper-evident application timestamp (synchronized with server time)
 * directly into image pixels to prevent staff fraud via phone clock tampering.
 */

export async function stampPhotoWithAppTime({
  source, // HTMLVideoElement | HTMLImageElement | File | Blob | string (base64/dataURL)
  staffName = 'Staff',
  status = 'Verifikasi',
  locationName = '',
  lat = null,
  lng = null,
  isGpsValid = true,
  maxWidth = 1080,
  quality = 0.78
}) {
  if (!source) {
    throw new Error('Sumber foto/kamera tidak tersedia.');
  }

  // 1. Resolve source to an image element or video element
  let resolvedElement = null;

  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    resolvedElement = source;
  } else if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    resolvedElement = source;
  } else if (typeof File !== 'undefined' && (source instanceof File || source instanceof Blob)) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
      reader.readAsDataURL(source);
    });
    resolvedElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar.'));
      img.src = dataUrl;
    });
  } else if (typeof source === 'string') {
    resolvedElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar base64.'));
      img.src = source;
    });
  } else {
    throw new Error('Format sumber foto tidak didukung.');
  }

  const vWidth = resolvedElement.videoWidth || resolvedElement.naturalWidth || resolvedElement.width || 0;
  const vHeight = resolvedElement.videoHeight || resolvedElement.naturalHeight || resolvedElement.height || 0;

  if (vWidth === 0 || vHeight === 0) {
    throw new Error('Ukuran foto tidak valid atau kamera belum siap.');
  }

  let targetWidth = vWidth;
  let targetHeight = vHeight;
  if (targetWidth > maxWidth) {
    const scale = maxWidth / targetWidth;
    targetWidth = maxWidth;
    targetHeight = Math.round(vHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context tidak tersedia.');

  // Draw source image
  ctx.save();
  ctx.drawImage(resolvedElement, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  // Official Synchronized Application Time (Protected against phone time tampering)
  const appNow = getAppNow();
  const nowWita = formatWitaDateTime(appNow.toISOString());

  // Determine accent color
  let accentColor = '#10b981'; // Green for normal / checkin / pass
  if (status.includes('Check-Out') || status.includes('Keluar') || status.includes('Sakit') || status.includes('Ditolak')) {
    accentColor = '#f43f5e'; // Rose
  } else if (status.includes('Istirahat') || status.includes('Break') || status.includes('Info')) {
    accentColor = '#0284c7'; // Sky
  } else if (status.includes('Cuti') || status.includes('Pulang') || status.includes('Telat')) {
    accentColor = '#f59e0b'; // Amber
  } else if (status.includes('Toilet') || status.includes('Inspeksi')) {
    accentColor = '#3b82f6'; // Blue
  }

  // Draw Overlay Banner at the bottom
  const bannerHeight = Math.max(54, Math.round(targetHeight * 0.12));
  const bannerY = targetHeight - bannerHeight;

  // Dark slate gradient background
  const gradient = ctx.createLinearGradient(0, bannerY, 0, targetHeight);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bannerY, targetWidth, bannerHeight);

  // Top accent line
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, bannerY, targetWidth, 4);

  // Text Styling
  const paddingX = Math.max(12, Math.round(targetWidth * 0.025));
  const fontSizeMain = Math.max(12, Math.min(18, Math.round(targetWidth * 0.022)));
  const fontSizeSub = Math.max(11, fontSizeMain - 2);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Line 1: [Staff Name / Location] • [Activity Status]
  ctx.font = `700 ${fontSizeMain}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#ffffff';
  const line1Y = bannerY + Math.round(bannerHeight * 0.38);
  const locationTag = locationName ? ` (${locationName})` : '';
  ctx.fillText(`${staffName}${locationTag} • ${status}`, paddingX, line1Y);

  // Line 2: [Official Synced Application Time]
  ctx.font = `600 ${fontSizeSub}px "SF Mono", Monaco, Consolas, monospace`;
  ctx.fillStyle = '#38bdf8'; // bright cyan
  const line2Y = bannerY + Math.round(bannerHeight * 0.78);
  const gpsTag = lat && lng ? ` • 📍 GPS (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})` : (isGpsValid ? '' : ' • ⚠️ GPS Unverified');
  ctx.fillText(`⏱️ ${nowWita} [Waktu Resmi Aplikasi]${gpsTag}`, paddingX, line2Y);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Captures frame from HTMLVideoElement or HTMLImageElement, burns hardcoded operational watermark,
 * and compresses client-side to lightweight JPEG.
 */
export async function captureAndWatermark({
  videoElement,
  imageElement,
  staffName,
  lat,
  lng,
  status = 'Check-In',
  locationName = '',
  isGpsValid = true,
  maxWidth = 960,
  quality = 0.72
}) {
  return stampPhotoWithAppTime({
    source: videoElement || imageElement,
    staffName,
    status,
    locationName,
    lat,
    lng,
    isGpsValid,
    maxWidth,
    quality
  });
}

/**
 * Watermarks a File / Blob directly from native file input capture
 */
export async function watermarkFile(file, options = {}) {
  return stampPhotoWithAppTime({
    source: file,
    ...options
  });
}
