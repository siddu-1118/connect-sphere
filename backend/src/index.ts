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
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use(errorHandler);

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Setup Socket.IO
setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;