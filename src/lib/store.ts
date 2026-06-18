import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Task } from '@/types';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), 'data', 'tasks.db');

// 初始化数据库
function initDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // 启用 WAL 模式
  db.pragma('journal_mode = WAL');

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      text TEXT NOT NULL,
      text_length INTEGER NOT NULL,
      voice_id TEXT NOT NULL,
      speed REAL NOT NULL DEFAULT 1.0,
      model TEXT NOT NULL DEFAULT 'speech-2.8-turbo',
      status TEXT NOT NULL DEFAULT 'pending',
      task_id TEXT,
      audio_filename TEXT,
      audio_duration INTEGER,
      audio_size INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
  `);

  return db;
}

// 单例数据库实例
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

// 生成 UUID
function generateId(): string {
  return crypto.randomUUID();
}

// 创建任务
export function createTask(params: {
  title?: string;
  text: string;
  voice_id: string;
  speed: number;
  model?: string;
}): Task {
  const id = generateId();
  const now = new Date().toISOString();
  const task: Task = {
    id,
    title: params.title || '',
    text: params.text,
    text_length: params.text.length,
    voice_id: params.voice_id,
    speed: params.speed,
    model: params.model || 'speech-2.8-turbo',
    status: 'pending',
    task_id: null,
    audio_filename: null,
    audio_duration: null,
    audio_size: null,
    error_message: null,
    created_at: now,
    updated_at: now,
  };

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, text, text_length, voice_id, speed, model, status, task_id, audio_filename, audio_duration, audio_size, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    task.id,
    task.title,
    task.text,
    task.text_length,
    task.voice_id,
    task.speed,
    task.model,
    task.status,
    task.task_id,
    task.audio_filename,
    task.audio_duration,
    task.audio_size,
    task.error_message,
    task.created_at,
    task.updated_at
  );

  return task;
}

// 获取任务
export function getTask(id: string): Task | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(id) as Task | undefined;
  return row || null;
}

// 更新任务
export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const db = getDb();
  const now = new Date().toISOString();

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.task_id !== undefined) {
    setClauses.push('task_id = ?');
    values.push(updates.task_id);
  }
  if (updates.audio_filename !== undefined) {
    setClauses.push('audio_filename = ?');
    values.push(updates.audio_filename);
  }
  if (updates.audio_duration !== undefined) {
    setClauses.push('audio_duration = ?');
    values.push(updates.audio_duration);
  }
  if (updates.audio_size !== undefined) {
    setClauses.push('audio_size = ?');
    values.push(updates.audio_size);
  }
  if (updates.error_message !== undefined) {
    setClauses.push('error_message = ?');
    values.push(updates.error_message);
  }

  setClauses.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  stmt.run(...values);

  return getTask(id);
}

// 原子获取下载锁：只有 status=processing 才能转为 downloading
export function tryLockForDownload(id: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `UPDATE tasks SET status = 'downloading', updated_at = ? WHERE id = ? AND status = 'processing'`
  );
  const result = stmt.run(now, id);
  return result.changes > 0;
}
