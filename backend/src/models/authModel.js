import { query } from '../config/database.js';

export async function findUserForLogin(email) {
  const result = await query(`
    SELECT u.id, u.email, u.password_hash AS "passwordHash", u.is_active AS "isActive",
           COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY[]::text[]) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id=u.id
    LEFT JOIN roles r ON r.id=ur.role_id
    WHERE u.email=$1
    GROUP BY u.id`, [email]);
  return result.rows[0] ?? null;
}

export async function createSession(userId, tokenHash, expiresAt) {
  await query(`DELETE FROM auth_sessions
    WHERE expires_at < now() OR revoked_at < now() - interval '30 days'`);
  await query(`INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)`, [tokenHash, userId, expiresAt]);
}

export async function findActiveAdminSession(tokenHash) {
  const result = await query(`
    SELECT u.id, u.email, s.expires_at AS "expiresAt"
    FROM auth_sessions s
    JOIN users u ON u.id=s.user_id
    JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles r ON r.id=ur.role_id AND r.code='admin'
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active=true
    LIMIT 1`, [tokenHash]);
  return result.rows[0] ?? null;
}

export async function revokeSession(tokenHash) {
  await query(`UPDATE auth_sessions SET revoked_at=now()
    WHERE token_hash=$1 AND revoked_at IS NULL`, [tokenHash]);
}
