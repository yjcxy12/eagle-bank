import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import type { CreateUserBody, GetUserParams, UpdateUserBody, UserRow } from './types.js';

export async function findUserById(
  db: Db,
  { userId }: GetUserParams,
): Promise<UserRow | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.deletedAt) return null;

  return user;
}

export async function createUser(
  db: Db,
  { name, email, password, phoneNumber, address }: CreateUserBody,
): Promise<{ error: 'email_taken' } | { user: UserRow }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) return { error: 'email_taken' };

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `usr-${nanoid()}`;

  const [user] = await db
    .insert(users)
    .values({ id, name, email, passwordHash, phoneNumber, address })
    .returning();

  return { user };
}

export async function updateUser(
  db: Db,
  { userId }: GetUserParams,
  data: UpdateUserBody,
): Promise<{ error: 'not_found' | 'email_taken' } | { user: UserRow }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing || existing.deletedAt) return { error: 'not_found' };

  if (data.email && data.email !== existing.email) {
    const emailTaken = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });
    if (emailTaken) return { error: 'email_taken' };
  }

  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return { user };
}
