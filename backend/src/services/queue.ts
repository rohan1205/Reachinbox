import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const emailQueueName = 'email-queue';

export const emailQueue: Queue | null = redisConnection ? new Queue(emailQueueName, {
  connection: redisConnection
}) : null;
