import { formatWitaDateTime } from './time.js';

/**
 * Captures frame from HTMLVideoElement or HTMLImageElement, burns hardcoded operational watermark,
 * and compresses client-side to lightweight JPEG (~60-80 KB).
 *
 * Watermark format:
 * [Nama] | [WITA Time] | [Check-In/Out/Break] | [GPS Valid]
 */
export async function captureAndWatermark({
  videoElement,
  imageElement,
  staffName,
  lat,
  lng,
  status = 'Check-In',
  isGpsValid = true,
  maxWidth = 960,
  quality = 0.68
}) {
  const source = videoElement || imageElement;
  if (!source) {
    throw new Error('Sumber kamera tidak tersedia.');
  }

  const vWidth = source.videoWidth || source.naturalWidth || source.width || 0;
  const vHeight = source.videoHeight || source.naturalHeight || source.height || 0;

  if (vWidth === 0 || vHeight === 0) {
    throw new Error('Gambar/kamera belum siap. Pastikan kamera sudah aktif.');
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

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // Draw frame (mirror if it's a live front video)
  ctx.save();
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
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
    const line2 = `[${nowWita}] • [${gpsStatusText}]`;
    const subFontSize = Math.max(11, fontSize - 2);
    ctx.font = `600 ${subFontSize}px sans-serif`;
    ctx.fillText(line1, paddingX, bannerY + Math.round(bannerHeight * 0.4));
    ctx.fillText(line2, paddingX, bannerY + Math.round(bannerHeight * 0.8));
  } else {
    ctx.fillText(watermarkText, paddingX, textY);
  }

  // Draw venue & location coords in small text at top-right
  if (lat && lng) {
    const coordsText = `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
    ctx.font = '500 11px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const coordsWidth = ctx.measureText(coordsText).width;
    ctx.fillText(coordsText, targetWidth - coordsWidth - 12, bannerY - 8);
  }

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Watermarks a File / Blob directly from native file input capture
 */
export async function watermarkFile(file, options) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await captureAndWatermark({ ...options, imageElement: img });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar dari kamera HP.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}
