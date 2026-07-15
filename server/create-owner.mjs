import {audit, db, newId, nowIso, publicUser} from './db.mjs';
import {hashPassword, normalizeEmail} from './security.mjs';

const email = normalizeEmail(process.env.ADMIN_OWNER_EMAIL);
const displayName = String(process.env.ADMIN_OWNER_NAME || 'NK Electrical Owner').trim();
const password = process.env.ADMIN_OWNER_PASSWORD;
if (!password) throw new Error('Set ADMIN_OWNER_PASSWORD before running admin:create-owner.');

const existingOwner = db.prepare("SELECT * FROM admin_users WHERE role = 'owner'").get();
if (existingOwner) throw new Error(`An owner already exists: ${existingOwner.email}`);

const id = newId();
const createdAt = nowIso();
db.prepare(`INSERT INTO admin_users
  (id, email, display_name, password_hash, role, active, password_changed_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'owner', 1, ?, ?, ?)`)
  .run(id, email, displayName, hashPassword(password), createdAt, createdAt, createdAt);
audit({userId: id, action: 'owner.created_cli', entityType: 'user', entityId: id, details: {email}});
console.log('Owner created:', publicUser(db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id)));
