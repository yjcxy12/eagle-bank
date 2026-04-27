import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import type { UserRow } from '../users/types.js';

export async function verifyCredentials({
  db,
  email,
  password,
}: {
  db: Db;
  email: string;
  password: string;
}): Promise<UserRow | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || user.deletedAt) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}
