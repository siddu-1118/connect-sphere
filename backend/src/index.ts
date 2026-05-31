import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { setupSocketIO } from './socket/signalingServer';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import meetingsRoutes from './routes/meetings';
import teamsRoutes from './routes/teams';
import calendarRoutes from './routes/calendar';
import { errorHandler } from './middleware/errorHandler'; // We'll create this next

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
  'https://aeromeet.vercel.app',
  'https://aeromeet.vercel.app/',
];
if (process.env.FRONTEND_URL) {
  const trimmed = process.env.FRONTEND_URL.replace(/\/$/, '');
  allowedOrigins.push(trimmed);
  allowedOrigins.push(`${trimmed}/`);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check & landing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AeroMeet API Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0B0F19;
            color: #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 40px;
            border-radius: 24px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          }
          h1 {
            color: #22d3ee;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 AeroMeet Backend Online</h1>
          <p>The real-time database and signaling server is running successfully. Connect your frontend client to begin.</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use(errorHandler);

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 7860;

// Setup Socket.IO
setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;