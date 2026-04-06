import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const emailQueueName = 'email-queue';

export const emailQueue = new Queue(emailQueueName, {
  connection: redisConnection
});
