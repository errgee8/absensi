import { formatWitaDateTime } from './time.js';

/**
 * Captures frame from HTMLVideoElement, burns hardcoded operational watermark,
 * and compresses client-side to lightweight JPEG (~60-80 KB).
 *
 * Watermark requirement:
 * [Nama] | [WITA Time] | [Check-In/Out/Break] | [GPS Valid]
 */
export async function captureAndWatermark({
  videoElement,
  staffName,
  lat,
  lng,
  status = 'Check-In',
  isGpsValid = true,
  maxWidth = 960,
  quality = 0.68
}) {
  if (!videoElement || videoElement.videoWidth === 0) {
    throw new Error('Kamera belum siap atau tidak aktif.');
  }

  const vWidth = videoElement.videoWidth;
  const vHeight = videoElement.videoHeight;

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

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // Draw video frame
  ctx.save();
  ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  const nowWita = formatWitaDateTime(new Date().toISOString());
  const gpsStatusText = isGpsValid ? 'GPS Valid' : 'GPS Unverified';

  // Format: [Nama] | [WITA Time] | [Status] | [GPS Valid]
  const watermarkText = `[${staffName || 'Staff'}] | [${nowWita}] | [${status}] | [${gpsStatusText}]`;

  // Draw Watermark Overlay Banner at the bottom
  const bannerHeight = Math.max(50, Math.round(targetHeight * 0.11));
  const bannerY = targetHeight - bannerHeight;

  // Background gradient bar
  const gradient = ctx.createLinearGradient(0, bannerY, 0, targetHeight);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.90)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, bannerY, targetWidth, bannerHeight);

  // Status accent line atop the banner
  let accentColor = '#10b981'; // green for Check-In
  if (status.includes('Check-Out') || status.includes('Keluar')) accentColor = '#f43f5e'; // red
  else if (status.includes('Istirahat') || status.includes('Break')) accentColor = '#38bdf8'; // sky blue for break

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, bannerY, targetWidth, 4);

  // Measure and render text
  const fontSize = Math.max(12, Math.min(20, Math.round(targetWidth * 0.023)));
  ctx.font = `600 ${fontSize}px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif`;

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const paddingX = Math.round(targetWidth * 0.03);
  const textY = bannerY + Math.round(bannerHeight / 2) + Math.round(fontSize / 3);

  const textWidth = ctx.measureText(watermarkText).width;
  if (textWidth > targetWidth - (paddingX * 2)) {
    const line1 = `[${staffName || 'Staff'}] • [${status}]`;
    const coordsShort = (lat != null && lng != null) ? `Lat: ${Number(lat).toFixed(4)}, Lng: ${Number(lng).toFixed(4)}` : '';
    const line2 = `[${nowWita}] • [${gpsStatusText} ${coordsShort}]`;
    
    ctx.fillText(line1, paddingX, bannerY + (bannerHeight * 0.38));
    ctx.font = `500 ${Math.round(fontSize * 0.85)}px monospace`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(line2, paddingX, bannerY + (bannerHeight * 0.78));
  } else {
    ctx.fillText(watermarkText, paddingX, textY);
  }

  // Security badge pill in top right corner
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const pillText = `VERIFIED • ${gpsStatusText.toUpperCase()}`;
  ctx.font = 'bold 10px monospace';
  const pillWidth = ctx.measureText(pillText).width + 16;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(targetWidth - pillWidth - 14, 14, pillWidth, 22);
  ctx.strokeStyle = isGpsValid ? '#10b981' : '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(targetWidth - pillWidth - 14, 14, pillWidth, 22);
  ctx.fillStyle = isGpsValid ? '#34d399' : '#fbbf24';
  ctx.fillText(pillText, targetWidth - pillWidth - 6, 29);

  return canvas.toDataURL('image/jpeg', quality);
}
