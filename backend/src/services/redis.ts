import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisConnection: Redis | null = null;

if (process.env.REDIS_URL) {
  redisConnection = new Redis(process.env.REDIS_URL);
} else {
  console.log("⚠️ Redis disabled");
}

export { redisConnection };
export const createRedisConnection = (): Redis => {
  if (!redisConnection) throw new Error("Redis not available");
  return redisConnection;
};
