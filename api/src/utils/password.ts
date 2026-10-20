import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/**
 * Senhas são armazenadas apenas como hash bcrypt (com salt embutido).
 * Usamos bcryptjs (JavaScript puro) para não depender de compilação nativa,
 * o que garante instalação idêntica em Windows, macOS, Linux e Alpine.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe. */
export const DUMMY_HASH = '$2b$10$8XqhVorG3ApF3CdigqGPuOjqG4aq0ndu4WYG0cw/1YvIEY9hJ/Xqu';
