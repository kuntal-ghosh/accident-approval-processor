import express from 'express';
import * as reportEvaluationController from '../controllers/reportEvaluation.controller';

export const reportEvaluationRoutes = express.Router();

reportEvaluationRoutes.post('/report/:reportId', reportEvaluationController.evaluateReport);
