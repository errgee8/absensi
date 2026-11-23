import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import zlib from 'zlib';

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Int32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
      }
    }
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const scanlines = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (stride + 1)] = 0;
    rgbaBuffer.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idatData),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

const inputPath = 'C:/Users/Ryand/.gemini/antigravity/brain/833df715-009d-494a-ab73-e3383f0e0218/.user_uploaded/media_1795454436333_90b22766.jpg';
const buf = fs.readFileSync(inputPath);
const decoded = jpeg.decode(buf);

const outDir = 'public/streak-frames';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Background reference color (dark purple background)
const bgR = 63, bgG = 47, bgB = 80;

function colorDist(r, g, b, tr = bgR, tg = bgG, tb = bgB) {
  const dr = r - tr;
  const dg = g - tg;
  const db = b - tb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// 10 Exact Calibrated Frames
const frames = [
  { id: 'bat', name: 'Bat Wings', cx: 123, cy: 106, innerR: 37 },
  { id: 'cat', name: 'Neko Bell', cx: 350, cy: 115, innerR: 39 },
  { id: 'devil', name: 'Demon Horns', cx: 541, cy: 111, innerR: 39 },
  { id: 'puppy', name: 'Puppy Bone', cx: 712, cy: 97, innerR: 38 },
  { id: 'bunny', name: 'Bunny Carrot', cx: 888, cy: 100, innerR: 39 },
  { id: 'unicorn', name: 'Unicorn Horn', cx: 139, cy: 295, innerR: 36 },
  { id: 'panda', name: 'Panda Bamboo', cx: 318, cy: 294, innerR: 39 },
  { id: 'dragon', name: 'Dragon Horns', cx: 497, cy: 305, innerR: 39 },
  { id: 'frog', name: 'Cute Frog', cx: 682, cy: 283, innerR: 36 },
  { id: 'royal_deer', name: 'Royal Antler Crown', cx: 881, cy: 314, innerR: 39 },
];

const cropSize = 220; // 220x220 output frame for generous wings/antlers room
const half = cropSize / 2;

for (const f of frames) {
  const outBuf = Buffer.alloc(cropSize * cropSize * 4, 0);

  for (let oy = 0; oy < cropSize; oy++) {
    for (let ox = 0; ox < cropSize; ox++) {
      const srcX = f.cx - half + ox;
      const srcY = f.cy - half + oy;
      const outIdx = (oy * cropSize + ox) * 4;

      if (srcX < 0 || srcX >= decoded.width || srcY < 0 || srcY >= decoded.height) {
        continue;
      }

      const srcIdx = (srcY * decoded.width + srcX) * 4;
      const r = decoded.data[srcIdx];
      const g = decoded.data[srcIdx + 1];
      const b = decoded.data[srcIdx + 2];

      const dx = ox - half;
      const dy = oy - half;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // 1. Transparent inner circle for avatar face
      if (distFromCenter < f.innerR - 1.5) {
        outBuf[outIdx + 3] = 0;
        continue;
      }

      let alpha = 255;
      if (distFromCenter < f.innerR + 1.5) {
        // Smooth feather edge from inside to ring
        alpha = Math.round(((distFromCenter - (f.innerR - 1.5)) / 3.0) * 255);
      }

      // 2. Background transparency check outside the ring
      if (distFromCenter > f.innerR + 8) {
        const cDist = colorDist(r, g, b);
        if (cDist < 16) {
          outBuf[outIdx + 3] = 0;
          continue;
        } else if (cDist < 26) {
          const bgFade = (cDist - 16) / 10;
          alpha = Math.round(alpha * bgFade);
        }
      }

      outBuf[outIdx] = r;
      outBuf[outIdx + 1] = g;
      outBuf[outIdx + 2] = b;
      outBuf[outIdx + 3] = alpha;
    }
  }

  const pngData = encodePng(cropSize, cropSize, outBuf);
  const outFilePath = path.join(outDir, `${f.id}.png`);
  fs.writeFileSync(outFilePath, pngData);
  console.log(`Saved ${f.id}.png (${f.name}) - ${pngData.length} bytes`);
}

console.log('All 10 streak avatar frames extracted and saved successfully to public/streak-frames/');
