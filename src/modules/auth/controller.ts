import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyCredentials } from './service.js';
import type { LoginBody } from './types.js';

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body;

  const user = await verifyCredentials({ db: request.server.db, email, password });

  if (!user) {
    return reply.status(401).send({ message: 'Invalid credentials' });
  }

  const token = request.server.jwt.sign({ userId: user.id });

  return reply.status(200).send({ token });
}
