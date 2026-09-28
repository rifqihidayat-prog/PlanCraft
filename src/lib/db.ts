import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { ProductSKU, WeeklyProductionPlan, WeeklyTargetItem, DailyProductionLog, AuthUser, UserRole } from '@/types';
import { DEFAULT_SKUS, INITIAL_PLANS, INITIAL_LOGS } from './mockData';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'plancraft.db');

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    initSchemaAndSeed(dbInstance);
  }
  return dbInstance;
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash.includes(':')) {
    return pin === storedHash;
  }
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

function initSchemaAndSeed(db: Database.Database) {
  // 1. Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skus (
      id TEXT PRIMARY KEY,
      sku_code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      specs TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS production_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS plan_targets (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      sku_name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_kg REAL NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES production_plans (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production_logs (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      date TEXT NOT NULL,
      sku_id TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      sku_name TEXT NOT NULL,
      actual_kg REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 2. Auto-seed Users if empty, or upgrade existing plain text PINs
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminPin = process.env.ADMIN_PIN || '1234';
    const prodPin = process.env.PRODUCTION_PIN || '1234';
    const insertUser = db.prepare('INSERT INTO users (id, username, name, role, pin) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('user-admin', 'admin', 'Admin PPIC', 'admin', hashPin(adminPin));
    insertUser.run('user-prod', 'produksi', 'Tim Produksi', 'production', hashPin(prodPin));
  } else {
    // Otomatis upgrade PIN plain text menjadi scrypt hash terenkripsi
    const existingUsers = db.prepare('SELECT id, pin FROM users').all() as Array<{ id: string; pin: string }>;
    const updatePinStmt = db.prepare('UPDATE users SET pin = ? WHERE id = ?');
    for (const u of existingUsers) {
      if (!u.pin.includes(':')) {
        updatePinStmt.run(hashPin(u.pin), u.id);
      }
    }
  }

  // 3. Auto-seed SKUs if empty
  const skuCount = db.prepare('SELECT COUNT(*) as count FROM skus').get() as { count: number };
  if (skuCount.count === 0) {
    const insertSku = db.prepare(
      'INSERT INTO skus (id, sku_code, name, category, unit, specs, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const seedSkusTx = db.transaction((items: ProductSKU[]) => {
      for (const item of items) {
        insertSku.run(item.id, item.sku_code, item.name, item.category, item.unit, item.specs || null, item.active ? 1 : 0);
      }
    });
    seedSkusTx(DEFAULT_SKUS);
  }

  // 4. Auto-seed Plans & Targets if empty
  const planCount = db.prepare('SELECT COUNT(*) as count FROM production_plans').get() as { count: number };
  if (planCount.count === 0) {
    const insertPlan = db.prepare(
      'INSERT INTO production_plans (id, title, week_number, year, start_date, end_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTarget = db.prepare(
      'INSERT INTO plan_targets (id, plan_id, sku_id, sku_code, sku_name, category, target_kg) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const seedPlansTx = db.transaction((plans: WeeklyProductionPlan[]) => {
      for (const p of plans) {
        insertPlan.run(p.id, p.title, p.week_number, p.year, p.start_date, p.end_date, p.status, p.notes || null);
        for (const t of p.targets) {
          const targetId = `${p.id}_${t.sku_id}`;
          insertTarget.run(targetId, p.id, t.sku_id, t.sku_code, t.sku_name, t.category, t.target_kg);
        }
      }
    });
    seedPlansTx(INITIAL_PLANS);
  }

  // 5. Auto-seed Logs if empty
  const logCount = db.prepare('SELECT COUNT(*) as count FROM production_logs').get() as { count: number };
  if (logCount.count === 0) {
    const insertLog = db.prepare(
      'INSERT INTO production_logs (id, plan_id, date, sku_id, sku_code, sku_name, actual_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const seedLogsTx = db.transaction((logs: DailyProductionLog[]) => {
      for (const l of logs) {
        insertLog.run(
          l.id,
          l.plan_id,
          l.date,
          l.sku_id,
          l.sku_code,
          l.sku_name,
          l.actual_kg,
          l.notes || null,
          l.created_at
        );
      }
    });
    seedLogsTx(INITIAL_LOGS);
  }

  // 6. Auto-seed App Settings if empty
  const activePlanSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'active_plan_id'").get();
  if (!activePlanSetting) {
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('active_plan_id', 'plan-w40-2026')").run();
  }
}

// ==================== QUERY HELPERS ====================

export function getAllSKUs(): ProductSKU[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM skus ORDER BY name ASC').all() as Array<{
    id: string;
    sku_code: string;
    name: string;
    category: string;
    unit: string;
    specs: string | null;
    active: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    sku_code: r.sku_code,
    name: r.name,
    category: r.category as ProductSKU['category'],
    unit: r.unit as ProductSKU['unit'],
    specs: r.specs || undefined,
    active: r.active === 1,
  }));
}

export function upsertSKUs(skus: ProductSKU[]): void {
  const db = getDatabase();
  const insertOrReplace = db.prepare(`
    INSERT INTO skus (id, sku_code, name, category, unit, specs, active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sku_code = excluded.sku_code,
      name = excluded.name,
      category = excluded.category,
      unit = excluded.unit,
      specs = excluded.specs,
      active = excluded.active
  `);

  const tx = db.transaction((items: ProductSKU[]) => {
    for (const item of items) {
      insertOrReplace.run(
        item.id,
        item.sku_code,
        item.name,
        item.category,
        item.unit,
        item.specs || null,
        item.active ? 1 : 0
      );
    }
  });

  tx(skus);
}

export function getAllPlans(): WeeklyProductionPlan[] {
  const db = getDatabase();
  const plans = db.prepare('SELECT * FROM production_plans ORDER BY year DESC, week_number DESC').all() as Array<{
    id: string;
    title: string;
    week_number: number;
    year: number;
    start_date: string;
    end_date: string;
    status: 'draft' | 'active' | 'completed';
    notes: string | null;
  }>;

  const getTargetsStmt = db.prepare('SELECT * FROM plan_targets WHERE plan_id = ?');

  return plans.map(p => {
    const targets = getTargetsStmt.all(p.id) as Array<{
      sku_id: string;
      sku_code: string;
      sku_name: string;
      category: string;
      target_kg: number;
    }>;

    return {
      id: p.id,
      title: p.title,
      week_number: p.week_number,
      year: p.year,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      notes: p.notes || undefined,
      targets: targets.map(t => ({
        sku_id: t.sku_id,
        sku_code: t.sku_code,
        sku_name: t.sku_name,
        category: t.category,
        target_kg: t.target_kg,
      })),
    };
  });
}

export function getActivePlanId(): string {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'active_plan_id'").get() as { value: string } | undefined;
  return row ? row.value : 'plan-w40-2026';
}

export function setActivePlanIdInDb(planId: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('active_plan_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(planId);
}

export function getActivePlan(): WeeklyProductionPlan {
  const plans = getAllPlans();
  if (plans.length === 0) return INITIAL_PLANS[0];

  const activeId = getActivePlanId();
  const found = plans.find(p => p.id === activeId);
  return found || plans.find(p => p.status === 'active') || plans[0];
}

export function savePlan(plan: WeeklyProductionPlan): void {
  const db = getDatabase();
  const upsertPlan = db.prepare(`
    INSERT INTO production_plans (id, title, week_number, year, start_date, end_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      week_number = excluded.week_number,
      year = excluded.year,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      status = excluded.status,
      notes = excluded.notes
  `);

  const deleteTargets = db.prepare('DELETE FROM plan_targets WHERE plan_id = ?');
  const insertTarget = db.prepare(`
    INSERT INTO plan_targets (id, plan_id, sku_id, sku_code, sku_name, category, target_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((p: WeeklyProductionPlan) => {
    upsertPlan.run(p.id, p.title, p.week_number, p.year, p.start_date, p.end_date, p.status, p.notes || null);
    deleteTargets.run(p.id);
    for (const t of p.targets) {
      const targetId = `${p.id}_${t.sku_id}`;
      insertTarget.run(targetId, p.id, t.sku_id, t.sku_code, t.sku_name, t.category, t.target_kg);
    }
  });

  tx(plan);
}

export function getAllLogs(): DailyProductionLog[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM production_logs ORDER BY date DESC, created_at DESC').all() as Array<{
    id: string;
    plan_id: string;
    date: string;
    sku_id: string;
    sku_code: string;
    sku_name: string;
    actual_kg: number;
    notes: string | null;
    created_at: string;
  }>;

  return rows.map(r => ({
    id: r.id,
    plan_id: r.plan_id,
    date: r.date,
    sku_id: r.sku_id,
    sku_code: r.sku_code,
    sku_name: r.sku_name,
    actual_kg: r.actual_kg,
    notes: r.notes || undefined,
    created_at: r.created_at,
  }));
}

export function addProductionLog(log: Omit<DailyProductionLog, 'id' | 'created_at'>): DailyProductionLog {
  const db = getDatabase();
  const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const created_at = new Date().toISOString();

  const fullLog: DailyProductionLog = {
    ...log,
    id,
    created_at,
  };

  const stmt = db.prepare(`
    INSERT INTO production_logs (id, plan_id, date, sku_id, sku_code, sku_name, actual_kg, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    fullLog.id,
    fullLog.plan_id,
    fullLog.date,
    fullLog.sku_id,
    fullLog.sku_code,
    fullLog.sku_name,
    fullLog.actual_kg,
    fullLog.notes || null,
    fullLog.created_at
  );

  return fullLog;
}

export function deleteProductionLog(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM production_logs WHERE id = ?').run(id);
  return res.changes > 0;
}

export function verifyUserCredentials(username: string, pin: string): AuthUser | null {
  const db = getDatabase();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPin = pin.trim();

  const user = db.prepare('SELECT id, username, name, role, pin FROM users WHERE LOWER(username) = ?').get(
    cleanUsername
  ) as { id: string; username: string; name: string; role: UserRole; pin: string } | undefined;

  if (!user) return null;

  if (!verifyPin(cleanPin, user.pin)) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

// ==================== SESSION MANAGEMENT ====================

export function createSession(userId: string): { token: string; expiresAt: Date } {
  const db = getDatabase();
  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, token, expiresAt.toISOString(), createdAt);

  return { token, expiresAt };
}

export function validateSession(token: string): AuthUser | null {
  if (!token) return null;
  const db = getDatabase();
  cleanExpiredSessions();

  const row = db.prepare(`
    SELECT u.id, u.username, u.name, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `).get(token) as { id: string; username: string; name: string; role: UserRole } | undefined;

  return row || null;
}

export function deleteSession(token: string): void {
  if (!token) return;
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function cleanExpiredSessions(): void {
  const db = getDatabase();
  db.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')").run();
}

// ==================== BROWSER DATA MIGRATION ====================

export function migrateBrowserData(data: {
  logs?: DailyProductionLog[];
  plans?: WeeklyProductionPlan[];
  skus?: ProductSKU[];
}): { migratedLogs: number; migratedPlans: number; migratedSkus: number } {
  const db = getDatabase();
  let migratedLogs = 0;
  let migratedPlans = 0;
  let migratedSkus = 0;

  // 1. Migrasi Logs (jangan menimpa atau menduplikasi yang sudah ada)
  if (Array.isArray(data.logs) && data.logs.length > 0) {
    const checkLogStmt = db.prepare('SELECT id FROM production_logs WHERE id = ?');
    const insertLogStmt = db.prepare(`
      INSERT INTO production_logs (id, plan_id, date, sku_id, sku_code, sku_name, actual_kg, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const logsTx = db.transaction((logs: DailyProductionLog[]) => {
      for (const l of logs) {
        const existing = checkLogStmt.get(l.id);
        if (!existing) {
          insertLogStmt.run(
            l.id,
            l.plan_id,
            l.date,
            l.sku_id,
            l.sku_code,
            l.sku_name,
            l.actual_kg,
            l.notes || null,
            l.created_at || new Date().toISOString()
          );
          migratedLogs++;
        }
      }
    });
    logsTx(data.logs);
  }

  // 2. Migrasi Plans jika ada plan kustom lokal
  if (Array.isArray(data.plans) && data.plans.length > 0) {
    for (const p of data.plans) {
      savePlan(p);
      migratedPlans++;
    }
  }

  // 3. Migrasi SKUs jika ada
  if (Array.isArray(data.skus) && data.skus.length > 0) {
    upsertSKUs(data.skus);
    migratedSkus = data.skus.length;
  }

  return { migratedLogs, migratedPlans, migratedSkus };
}

