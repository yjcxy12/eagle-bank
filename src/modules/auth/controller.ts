import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyCredentials } from './service.js';

export const loginSchema = {
  body: z.object({
    email: z.email(),
    password: z.string().min(1),
  }),
  response: {
    200: z.object({
      token: z.string(),
    }),
  },
};

type LoginBody = z.infer<typeof loginSchema.body>;

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body;

  const user = await verifyCredentials(request.server.db, { email, password });

  if (!user) {
    return reply.status(401).send({ message: 'Invalid credentials' });
  }

  const token = request.server.jwt.sign({ userId: user.id });

  return reply.status(200).send({ token });
}
