import type { FastifyReply } from 'fastify';
import type { ZodError } from 'zod';

export function sendNotFound(reply: FastifyReply, message: string) {
  return reply.status(404).send({ message });
}

export function sendForbidden(reply: FastifyReply, message: string) {
  return reply.status(403).send({ message });
}

export function sendConflict(reply: FastifyReply, message: string) {
  return reply.status(409).send({ message });
}

export function sendUnprocessable(reply: FastifyReply, message: string) {
  return reply.status(422).send({ message });
}

export function sendBadRequest(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    message: 'Validation failed',
    details: error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      type: e.code,
    })),
  });
}
