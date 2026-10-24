import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../utils/errors.js';

const scrypt = promisify(scryptCallback);
const parameters = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const dummySalt = Buffer.alloc(16, 0x4f);
const dummyKey = scryptSync('invalid-account-password', dummySalt, KEY_LENGTH, parameters);
const DUMMY_HASH = `scrypt$16384$8$1$${dummySalt.toString('base64url')}$${dummyKey.toString('base64url')}`;

export function validatePasswordForCreation(password) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 128) {
    throw new ApiError(400, 'La contraseña debe tener entre 12 y 128 bytes.');
  }
}

export async function hashPassword(password) {
  validatePasswordForCreation(password);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, parameters);
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, encodedHash) {
  const parts = typeof encodedHash === 'string' ? encodedHash.split('$') : [];
  const validFormat = parts.length === 6 && parts[0] === 'scrypt' && parts[1] === '16384' && parts[2] === '8' && parts[3] === '1';
  const reference = validFormat ? parts[5] : DUMMY_HASH.split('$')[5];
  const salt = validFormat ? Buffer.from(parts[4], 'base64url') : dummySalt;
  const expected = Buffer.from(reference, 'base64url');
  if (expected.length !== KEY_LENGTH || salt.length !== 16) return false;
  const actual = await scrypt(password, salt, KEY_LENGTH, parameters);
  const matches = timingSafeEqual(actual, expected);
  return validFormat && matches;
}
