import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { emailQueue } from '../services/queue';

const router = Router();
const MAX_EMAILS_PER_HOUR_PER_SENDER = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || 200);

// Used an extended validator to allow both strict objects and more loose payloads from frontend
const scheduleSchema = z.object({
  senderEmail: z.string().email(),
  startTime: z.string().datetime().or(z.date().transform(d => d.toISOString())),
  delaySecs: z.number().min(0),
  hourlyLimit: z.number().min(1),
  emails: z.array(z.object({
    recipientEmail: z.string().trim().email(),
    subject: z.string(),
    body: z.string()
  }))
});

router.post('/schedule', async (req, res) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const effectiveHourlyLimit = Math.min(data.hourlyLimit, MAX_EMAILS_PER_HOUR_PER_SENDER);
    
    // 1. Save Scheduling Request
    const request = await prisma.schedulingRequest.create({
      data: {
        senderEmail: data.senderEmail,
        startTime: new Date(data.startTime),
        delaySecs: data.delaySecs,
        hourlyLimit: effectiveHourlyLimit,
        emails: {
          create: data.emails.map(e => ({
            recipientEmail: e.recipientEmail,
            subject: e.subject,
            body: e.body,
            scheduledAt: new Date(data.startTime),
            status: 'PENDING'
          }))
        }
      },
      include: { emails: true }
    });

    // 2. Queue jobs with individual delay spacing
    const startTimeMs = new Date(data.startTime).getTime();
    
    for (let i = 0; i < request.emails.length; i++) {
      const email = request.emails[i];
      // Increase delay per email based on `delaySecs` parameter
      const triggerTimeMs = Math.max(startTimeMs, Date.now()) + (i * data.delaySecs * 1000);
      const delayAmount = triggerTimeMs - Date.now();
      
      // Update individual row schedule time for accuracy in DB
      await prisma.scheduledEmail.update({
         where: { id: email.id },
         data: { scheduledAt: new Date(triggerTimeMs) }
      });

      await emailQueue.add('send-email', {
        emailId: email.id,
        senderEmail: data.senderEmail,
        hourlyLimit: effectiveHourlyLimit,
        delaySecs: data.delaySecs
      }, {
        delay: Math.max(0, delayAmount),
        jobId: `email-${email.id}`, // Idempotency
        removeOnComplete: true
      });
    }

    res.status(201).json({
      message: 'Scheduled successfully',
      request,
      appliedHourlyLimit: effectiveHourlyLimit
    });
  } catch (err: any) {
    console.error("Schedule error:", err);
    res.status(400).json({ error: err.issues || err.message || 'Invalid Request' });
  }
});

router.get('/scheduled', async (req, res) => {
  try {
    const { sender } = req.query;
    const emails = await prisma.scheduledEmail.findMany({
      where: { 
        status: 'PENDING',
        schedulingRequest: sender ? { senderEmail: sender as string } : undefined
      },
      orderBy: { scheduledAt: 'asc' },
      include: { schedulingRequest: { select: { senderEmail: true } } }
    });
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sent', async (req, res) => {
  try {
    const { sender } = req.query;
    const emails = await prisma.scheduledEmail.findMany({
      where: { 
        status: { in: ['SENT', 'FAILED'] },
        schedulingRequest: sender ? { senderEmail: sender as string } : undefined
      },
      orderBy: { sentAt: 'desc' },
      include: { schedulingRequest: { select: { senderEmail: true } } }
    });
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
