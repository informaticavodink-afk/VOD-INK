/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './utils/env';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Router } from 'express';
import { refreshSupabaseSession } from './utils/supabase/middleware';
import consentRoutes from './server/routes/consents';
import artistRoutes from './server/routes/artists';
import adminRoutes from './server/routes/admins';
import publicArtistRoutes from './server/routes/publicArtists';
import studioSettingsRoutes from './server/routes/studioSettings';

const app = express();
const apiRouter = Router();
apiRouter.use('/consents', consentRoutes);
apiRouter.use('/artists', artistRoutes);
apiRouter.use('/admins', adminRoutes);
apiRouter.use('/public/artists', publicArtistRoutes);
apiRouter.use('/studio-settings', studioSettingsRoutes);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Ensure local folders exist for secure backup of consents
const DATA_DIR = path.join(process.cwd(), 'data');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR);
}

const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
if (!fs.existsSync(SUBMISSIONS_FILE)) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([]));
}

// Support large JSON payloads (since we receive Base64 PDFs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Refresh Supabase Auth cookies for API requests that include a Supabase session.
app.use('/api', refreshSupabaseSession);
app.use('/api', apiRouter);

// Helper to get local submissions
function getLocalSubmissions(): any[] {
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// Helper to write local submissions
function writeLocalSubmissions(subs: any[]) {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.error('Failed to write submissions log:', e);
  }
}

// --- API ROUTES ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Fetch submissions
app.get('/api/submissions', (req, res) => {
  res.json(getLocalSubmissions());
});

// 3. Upload and Register PDF Consent
app.post('/api/upload-to-drive', async (req, res) => {
  const {
    pdfBase64,
    fileName,
    carpetaDriveId,
    tatuadorNombre,
    clienteNombre,
    clienteDni,
    tatuadorId,
  } = req.body;

  if (!pdfBase64 || !fileName || !clienteNombre || !clienteDni) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // A. Backup the physical file to the server's local disk immediately (VOD INK Secure Vault)
    const localFilePath = path.join(PDFS_DIR, fileName);
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(localFilePath, pdfBuffer);
    console.log(`[Backup] PDF guardado físicamente en servidor: ${localFilePath}`);

    // B. Register Submission in local JSON index
    const submissionId = 'SUB_' + Math.random().toString(36).slice(2, 11).toUpperCase();
    const newSubmission = {
      id: submissionId,
      tatuadorId: tatuadorId || 'unknown',
      tatuadorNombre: tatuadorNombre || 'Tatuador VOD INK',
      clienteNombre: clienteNombre,
      clienteDni: clienteDni,
      fecha: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      driveFileId: null,
      driveViewLink: null,
      estado: 'pendiente', // Default: pending Google Drive upload
      localBackupPath: `/data/pdfs/${fileName}`,
    };

    // C. Try to upload to Google Drive if OAuth environment has tokens or if client provided a token
    // (For this applet, since it uses standalone OAuth, we check if there's an access token)
    const clientAuthToken = req.headers.authorization; // Check if frontend passed an access token
    let driveFileId: string | null = null;
    let driveViewLink: string | null = null;

    if (clientAuthToken && clientAuthToken.startsWith('Bearer ') && carpetaDriveId) {
      const accessToken = clientAuthToken.split(' ')[1];
      try {
        console.log(`[Drive] Intentando subir a carpeta Drive ID: ${carpetaDriveId}`);
        
        const metadata = {
          name: fileName,
          parents: [carpetaDriveId],
          mimeType: 'application/pdf',
        };

        const boundary = 'vod_ink_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/pdf\r\n' +
          'Content-Transfer-Encoding: base64\r\n\r\n' +
          pdfBase64 +
          closeDelimiter;

        const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        });

        if (driveRes.ok) {
          const driveData: any = await driveRes.json();
          driveFileId = driveData.id;
          driveViewLink = `https://drive.google.com/file/d/${driveFileId}/view`;
          
          newSubmission.driveFileId = driveFileId as any;
          newSubmission.driveViewLink = driveViewLink as any;
          newSubmission.estado = 'ok';
          console.log(`[Drive] Subida exitosa a Google Drive. ID de archivo: ${driveFileId}`);
        } else {
          console.error('[Drive] Error al subir a Google Drive:', await driveRes.text());
        }
      } catch (driveErr) {
        console.error('[Drive] Excepción durante la conexión con Google API:', driveErr);
      }
    } else {
      console.log('[Drive] Saltando subida a Drive (No se ha recibido token de autorización de Google o falta ID de carpeta)');
    }

    // Save submission log
    const subs = getLocalSubmissions();
    subs.unshift(newSubmission);
    writeLocalSubmissions(subs);

    return res.status(200).json({
      success: true,
      submissionId: newSubmission.id,
      driveFileId: newSubmission.driveFileId,
      driveViewLink: newSubmission.driveViewLink,
      estado: newSubmission.estado,
    });

  } catch (err: any) {
    console.error('Critical failure in /api/upload-to-drive:', err);
    return res.status(500).json({ error: 'Fallo interno del servidor: ' + err.message });
  }
});

// Catch-all error handler for /api routes: guarantees a JSON response even if
// something throws outside a route's own try/catch (e.g. auth middleware),
// instead of letting Express fall back to an HTML error page that breaks
// `response.json()` on the client and shows a generic fallback message.
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API] Error no controlado:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: err instanceof Error ? err.message : 'Error interno del servidor',
  });
});

// --- VITE MIDDLEWARE SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Vite] Servidor de desarrollo Vite integrado como Middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Production] Sirviendo recursos estáticos construidos desde /dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VOD INK] Servidor escuchando en http://localhost:${PORT}`);
  });
}

startServer();
