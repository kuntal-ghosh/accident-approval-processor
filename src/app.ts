import express from 'express';
import dotenv from 'dotenv';
import DatabaseSingleton from './services/db.singleton';
// import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { accidentReportRoutes } from './routes/accidentReport.routes';
import { criteriaRoutes } from './routes/criteria.routes';
import { reportEvaluationRoutes } from './routes/reportEvaluation.routes';
import {OPENAI_API_KEY} from "./config/key";

// Load environment variables
dotenv.config();


// Initialize Express application
const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(express.json());
app.use(requestLogger);

// console.log("process.env.OPENAI_API_KEY", process.env.OPENAI_API_KEY);
// // Validate required environment variables
// const apiKey = process.env.OPENAI_API_KEY;
// if (!apiKey) {
//   console.error('OPENAI_API_KEY not found in environment variables');
//   process.exit(1);
// }
// if (!process.env.OPENAI_API_KEY) {
//     console.error('OPENAI_API_KEY not found in environment variables');
//     process.exit(1);
//   }


// Routes
app.use('/api/reports', accidentReportRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/evaluation', reportEvaluationRoutes);

// Error handling middleware
// app.use(errorHandler);

// Initialize the database connection and start server
const server = app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  try {
    await DatabaseSingleton.getInstance();
    console.log('Connected to the PostgreSQL database.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await DatabaseSingleton.closeConnection();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
