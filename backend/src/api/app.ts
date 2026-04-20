import cors from 'cors';
import express from 'express';
import { env } from '../config/env';
import { authRouter } from './routes/auth.route';
import { healthRouter } from './routes/health.route';
import { insightsRouter } from './routes/insights.route';

export const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/insights', insightsRouter);
