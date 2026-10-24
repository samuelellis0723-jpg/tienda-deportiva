import { stdin, stdout } from 'node:process';
import { withTransaction, closePool } from '../src/config/database.js';
import { hashPassword, validatePasswordForCreation } from '../src/services/passwordService.js';

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') throw new Error('Ejecuta este comando en una terminal interactiva.');
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      const key = chunk.toString('utf8');
      if (key === '\u0003') {
        cleanup();
        reject(new Error('Operación cancelada.'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        stdout.write('\n');
        resolve(value);
      } else if (key === '\u007f' || key === '\b') {
        if (value.length) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
      } else if (!key.startsWith('\u001b')) {
        value += key;
        stdout.write('*');
      }
    };
    function cleanup() {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    }
    stdin.on('data', onData);
  });
}

try {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Uso: npm run admin:create -- admin@dominio.tld');
  }
  const password = await readHidden('Contraseña nueva (no se mostrará): ');
  validatePasswordForCreation(password);
  const confirmation = await readHidden('Repite la contraseña: ');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const passwordHash = await hashPassword(password);
  await withTransaction(async (client) => {
    const user = await client.query(`
      INSERT INTO users (email,password_hash,is_active) VALUES ($1,$2,true)
      ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,is_active=true,updated_at=now()
      RETURNING id`, [email, passwordHash]);
    const userId = user.rows[0].id;
    const role = await client.query(`
      INSERT INTO roles (code,name) VALUES ('admin','Administrador')
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name
      RETURNING id`);
    await client.query('INSERT INTO user_roles (user_id,role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, role.rows[0].id]);
    await client.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);
  });
  console.log(`Cuenta administrativa configurada para ${email}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
