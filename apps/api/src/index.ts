import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { assertRequiredEnv } from './env';
import { router as claimRouter } from './routes/claim';
import { router as claimDevRouter } from './routes/claim-dev';
import { router as editionsRouter } from './routes/editions';
import { router as adminRouter } from './routes/admin';

assertRequiredEnv();

const app = express();
app.use(
  cors({
    origin: [
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
      /^https:\/\/.*\.trycloudflare\.com$/,
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.ngrok\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 claims per hour per IP
  message: 'Too many claim attempts, please try again in an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per IP
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Apply rate limiters to routes
app.use('/claim', claimLimiter, claimRouter);
app.use('/claim-dev', claimLimiter, claimDevRouter);
app.use('/editions', generalLimiter, editionsRouter);
app.use('/admin', adminLimiter, adminRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
