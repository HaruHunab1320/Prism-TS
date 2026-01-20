import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

export type SessionRole = 'user' | 'assistant' | 'system';

export interface SessionMessage {
  role: SessionRole;
  content: string;
  timestamp: string;
}

export interface SessionRecord {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
}

const DATA_DIR = path.join(os.homedir(), '.prism-agent');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson(): Promise<SessionRecord[]> {
  try {
    const raw = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(raw) as SessionRecord[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJson(records: SessionRecord[]) {
  await ensureDataDir();
  await fs.writeFile(SESSION_FILE, JSON.stringify(records, null, 2), 'utf8');
}

export class SessionStore {
  async list(): Promise<SessionRecord[]> {
    return readJson();
  }

  async find(id: string): Promise<SessionRecord | undefined> {
    const sessions = await readJson();
    return sessions.find((session) => session.id === id);
  }

  async upsert(session: SessionRecord): Promise<SessionRecord> {
    const sessions = await readJson();
    const existingIndex = sessions.findIndex((item) => item.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    await writeJson(sessions);
    return session;
  }

  async create(label: string, seedMessages: SessionMessage[] = []): Promise<SessionRecord> {
    const now = new Date().toISOString();
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      label,
      createdAt: now,
      updatedAt: now,
      messages: [...seedMessages],
    };
    await this.upsert(session);
    return session;
  }

  async appendMessage(sessionId: string, message: SessionMessage): Promise<SessionRecord> {
    const session = await this.find(sessionId);
    if (!session) {
      throw new Error(`Unknown session "${sessionId}"`);
    }
    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    return this.upsert(session);
  }
}
