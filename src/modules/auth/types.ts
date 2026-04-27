import { z } from 'zod';

const loginResponseSchema = z.object({
  token: z.string(),
});

export const loginSchema = {
  body: z.object({
    email: z.email(),
    password: z.string().min(8),
  }),
  response: {
    200: loginResponseSchema,
  },
};

export type LoginBody = z.infer<typeof loginSchema.body>;
