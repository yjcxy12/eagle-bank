import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';

export async function verifyCredentials(db: Db, { email, password }: { email: string; password: string }) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || user.deletedAt) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}
