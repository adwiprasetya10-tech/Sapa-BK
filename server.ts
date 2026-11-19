import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WebSocket, WebSocketServer } from 'ws';
import { createInitialDatabase } from './src/data/seedData.ts';
import {
  applySiBKAction,
  normalizeAppSettings,
  normalizeDatabase,
} from './src/shared/sibkActions.ts';
import type { SiBKAction, SiBKSharedState } from './src/shared/sibkActions.ts';
import { DEFAULT_APP_SETTINGS } from './src/utils/appSettings.ts';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'sibk.sqlite');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA synchronous = NORMAL;');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sibk_store (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    revision INTEGER NOT NULL,
    db_json TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

interface StoreRow {
  revision: number;
  db_json: string;
  settings_json: string;
}

const selectStoreStmt = sqlite.prepare(
  'SELECT revision, db_json, settings_json FROM sibk_store WHERE id = 1'
);
const insertStoreStmt = sqlite.prepare(
  'INSERT INTO sibk_store (id, revision, db_json, settings_json, updated_at) VALUES (1, ?, ?, ?, ?)'
);
const updateStoreStmt = sqlite.prepare(
  'UPDATE sibk_store SET revision = ?, db_json = ?, settings_json = ?, updated_at = ? WHERE id = 1'
);

function loadOrInitializeStore(): { revision: number; state: SiBKSharedState } {
  const existing = selectStoreStmt.get() as StoreRow | undefined;
  if (existing) {
    try {
      const parsedDb = JSON.parse(existing.db_json);
      const parsedSettings = JSON.parse(existing.settings_json);
      return {
        revision: existing.revision || 1,
        state: {
          db: normalizeDatabase(parsedDb),
          settings: normalizeAppSettings(parsedSettings),
        },
      };
    } catch {
      // Fallback to fresh seed if JSON is corrupted
    }
  }

  const freshState: SiBKSharedState = {
    db: createInitialDatabase(),
    settings: DEFAULT_APP_SETTINGS,
  };
  const now = new Date().toISOString();
  if (existing) {
    updateStoreStmt.run(
      1,
      JSON.stringify(freshState.db),
      JSON.stringify(freshState.settings),
      now
    );
  } else {
    insertStoreStmt.run(
      1,
      JSON.stringify(freshState.db),
      JSON.stringify(freshState.settings),
      now
    );
  }
  return { revision: 1, state: freshState };
}

let { revision: currentRevision, state: currentState } = loadOrInitializeStore();

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const aliveMap = new WeakMap<WebSocket, boolean>();

  function countOpenClients(): number {
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        count += 1;
      }
    });
    return count;
  }

  function broadcastJson(payload: unknown): void {
    const serialized = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
        return;
      }
    } catch {
      // Ignore malformed upgrade URL
    }
    socket.destroy();
  });

  wss.on('connection', (ws) => {
    aliveMap.set(ws, true);
    ws.on('pong', () => {
      aliveMap.set(ws, true);
    });

    ws.send(
      JSON.stringify({
        type: 'state:init',
        revision: currentRevision,
        db: currentState.db,
        settings: currentState.settings,
        connectedClients: countOpenClients(),
        serverTime: new Date().toISOString(),
      })
    );
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (aliveMap.get(ws) === false) {
        ws.terminate();
        return;
      }
      aliveMap.set(ws, false);
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      revision: currentRevision,
      connectedClients: countOpenClients(),
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/state', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      revision: currentRevision,
      db: currentState.db,
      settings: currentState.settings,
      connectedClients: countOpenClients(),
      serverTime: new Date().toISOString(),
    });
  });

  app.post('/api/action', (req: Request, res: Response) => {
    const body = req.body as { action?: SiBKAction; clientId?: string } | undefined;
    const action = body?.action;
    const originClientId = typeof body?.clientId === 'string' ? body.clientId : '';

    if (!action || typeof action.type !== 'string') {
      res.status(400).json({ ok: false, error: 'Invalid action payload.' });
      return;
    }

    try {
      const nextState = applySiBKAction(currentState, action);
      if (nextState !== currentState) {
        currentRevision += 1;
        currentState = nextState;
        updateStoreStmt.run(
          currentRevision,
          JSON.stringify(currentState.db),
          JSON.stringify(currentState.settings),
          new Date().toISOString()
        );

        broadcastJson({
          type: 'state:sync',
          revision: currentRevision,
          originClientId,
          actionType: action.type,
          db: currentState.db,
          settings: currentState.settings,
          connectedClients: countOpenClients(),
          serverTime: new Date().toISOString(),
        });
      }

      res.json({
        ok: true,
        revision: currentRevision,
        db: currentState.db,
        settings: currentState.settings,
        connectedClients: countOpenClients(),
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[SiBK Server] Failed to process action:', action.type, err);
      res.status(500).json({ ok: false, error: 'Gagal menyimpan perubahan ke database.' });
    }
  });

  const isDev =
    process.env.NODE_ENV === 'development' ||
    !fs.existsSync(path.join(DIST_DIR, 'index.html'));

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SiBK] Server running on http://0.0.0.0:${PORT} (rev ${currentRevision})`);
  });
}

startServer().catch((err) => {
  console.error('[SiBK] Fatal server startup error:', err);
  process.exit(1);
});
