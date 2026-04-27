import { z } from 'zod';
import type { users } from '../../db/schema/index.js';
import type { Address } from '../../db/schema/users.js';

export type { Address };
export type UserRow = typeof users.$inferSelect;

const addressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  line3: z.string().optional(),
  town: z.string(),
  county: z.string(),
  postcode: z.string(),
}) satisfies z.ZodType<Address>;

const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  address: addressSchema,
  createdTimestamp: z.string(),
  updatedTimestamp: z.string(),
});

// Strict field validators shared by create and update
const userRequestBodySchema = z.object({
  name: z.string().max(255),
  email: z.email(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
  address: addressSchema,
});

export const createUserSchema = {
  body: userRequestBodySchema.extend({ password: z.string().min(8) }),
  response: {
    201: userResponseSchema,
  },
};

const userIdParams = z.object({
  userId: z.string().regex(/^usr-[A-Za-z0-9]+$/),
});

export const getUserSchema = {
  params: userIdParams,
  response: {
    200: userResponseSchema,
  },
};

export const updateUserSchema = {
  params: userIdParams,
  body: userRequestBodySchema.partial(),
  response: {
    200: userResponseSchema,
  },
};

export const deleteUserSchema = {
  params: userIdParams,
};

export type User = z.infer<typeof userResponseSchema>;
export type CreateUserBody = z.infer<typeof createUserSchema.body>;
export type UpdateUserBody = z.infer<typeof updateUserSchema.body>;
export type GetUserParams = z.infer<typeof getUserSchema.params>;
