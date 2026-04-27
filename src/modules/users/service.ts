import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '../../db/index.js';
import { accounts, users } from '../../db/schema/index.js';
import type { CreateUserBody, UpdateUserBody, UserRow } from './types.js';

async function isEmailTaken(db: Db, email: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) return { error: 'email_taken' };
}

export async function findUserById({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<UserRow | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.deletedAt) return null;

  return user;
}

export async function createUser({
  db,
  data,
}: {
  db: Db;
  data: CreateUserBody;
}): Promise<{ error: 'email_taken' } | { user: UserRow }> {
  const emailTaken = await isEmailTaken(db, data.email);
  if (emailTaken) {
    return { error: 'email_taken' };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const id = `usr-${nanoid()}`;

  const [user] = await db
    .insert(users)
    .values({
      id,
      name: data.name,
      email: data.email,
      passwordHash,
      phoneNumber: data.phoneNumber,
      address: data.address,
    })
    .returning();

  return { user };
}

export async function updateUser({
  db,
  userId,
  data,
}: {
  db: Db;
  userId: string;
  data: UpdateUserBody;
}): Promise<{ error: 'not_found' | 'email_taken' } | { user: UserRow }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing || existing.deletedAt) return { error: 'not_found' };

  if (data.email && data.email !== existing.email) {
    const emailTaken = await isEmailTaken(db, data.email);
    if (emailTaken) {
      return { error: 'email_taken' };
    }
  }

  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return { user };
}

export async function deleteUser({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<{ error: 'not_found' | 'has_accounts' } | { success: true }> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing || existing.deletedAt) return { error: 'not_found' };

  const activeAccount = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), isNull(accounts.deletedAt)),
  });

  if (activeAccount) return { error: 'has_accounts' };

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true };
}
