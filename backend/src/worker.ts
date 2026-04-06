import { Worker, Job, DelayedError } from 'bullmq';
import { emailQueueName } from './services/queue';
import { redisConnection } from './services/redis';
import { prisma } from './prisma';
import { transporter } from './services/email';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');
const MIN_SEND_INTERVAL_MS = Number(process.env.MIN_SEND_INTERVAL_MS || 2000);

const worker = new Worker(emailQueueName, async (job: Job) => {
  const { emailId, senderEmail, hourlyLimit, delaySecs } = job.data;

  // 1. Enforce Hourly Rate Limit per sender (Redis-backed, safe across workers)
  const date = new Date();
  const hourKey = date.toISOString().slice(0, 13); // e.g. 2026-04-06T15
  const limitKey = `emails_sent:${senderEmail}:${hourKey}`;

  const sentCount = await redisConnection.incr(limitKey);
  
  if (sentCount === 1) {
    // TTL of 2 hours
    await redisConnection.expire(limitKey, 60 * 60 * 2);
  }

  if (sentCount > hourlyLimit) {
    // Limit reached, rollback the increment for this hour
    await redisConnection.decr(limitKey);

    // Preserve order as much as possible by assigning a sequence in next hour.
    const nextHourStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + 1, 0, 0).getTime();
    const nextHourKey = new Date(nextHourStart).toISOString().slice(0, 13);
    const overflowSeqKey = `emails_overflow_seq:${senderEmail}:${nextHourKey}`;
    const overflowSeq = await redisConnection.incr(overflowSeqKey);
    if (overflowSeq === 1) {
      await redisConnection.expire(overflowSeqKey, 60 * 60 * 3);
    }

    const slotSpacingMs = Math.max(MIN_SEND_INTERVAL_MS, Number(delaySecs || 0) * 1000, 1000);
    const delayedTo = nextHourStart + ((overflowSeq - 1) * slotSpacingMs);
    console.log(`[Rate Limit] ${senderEmail} exceeded ${hourlyLimit}/hr. Moving job ${job.id} to ${new Date(delayedTo).toISOString()}.`);

    await job.moveToDelayed(delayedTo, job.token!);
    throw new DelayedError();
  }

  // 2. Fetch and Send Email
  const emailJob = await prisma.scheduledEmail.findUnique({ where: { id: emailId } });
  if (!emailJob || emailJob.status !== 'PENDING') {
    return; // Already processed or canceled
  }

  try {
    await transporter.sendMail({
      from: senderEmail,
      to: emailJob.recipientEmail,
      subject: emailJob.subject,
      text: emailJob.body
    });

    await prisma.scheduledEmail.update({
      where: { id: emailId },
      data: { status: 'SENT', sentAt: new Date() }
    });
    
    console.log(`[Sent] Job ${job.id} -> ${emailJob.recipientEmail}`);
  } catch (err) {
    await prisma.scheduledEmail.update({
      where: { id: emailId },
      data: { status: 'FAILED' }
    });
    throw err;
  }

}, {
  connection: redisConnection,
  concurrency: WORKER_CONCURRENCY,
  // Global queue limiter (Redis-backed) to enforce min delay between sends.
  limiter: {
    max: 1,
    duration: MIN_SEND_INTERVAL_MS
  }
});

worker.on('completed', job => {
  console.log(`Job with id ${job.id} has been completed`);
});

worker.on('failed', (job, err) => {
  if (err instanceof DelayedError) return; // Expected for rate limiting
  console.log(`Job with id ${job?.id} has failed with ${err.message}`);
});

console.log(`Worker started on queue ${emailQueueName} with concurrency ${WORKER_CONCURRENCY}`);
