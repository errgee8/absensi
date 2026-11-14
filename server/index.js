import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes.js';
import { auditOpenShifts } from './flags.js';
import { uploadsDir } from './db.js';
import cloudDb from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
// Set JSON limit high enough for client-side compressed base64 images (~100-250KB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads serving
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api', routes);

// Periodic audit scanner every 10 minutes
setInterval(() => {
  try {
    auditOpenShifts();
  } catch (err) {
    console.error('Audit scanner error:', err);
  }
}, 10 * 60 * 1000);

// Production static file serving for built React PWA
const clientDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Catch-all route for SPA navigation in Express 5
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`JP Check-in Server running on http://localhost:${PORT}`);
  console.log(`API endpoints active at http://localhost:${PORT}/api/`);
  console.log(`===============================================`);

  // Sync staff roster to toilet inspection database in background
  cloudDb.syncStaffToToiletDb().catch((err) => {
    console.warn('Initial toilet staff sync note:', err.message);
  });
});
