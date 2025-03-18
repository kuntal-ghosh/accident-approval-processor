import express from 'express';
import * as accidentReportController from '../controllers/accidentReport.controller';

export const accidentReportRoutes = express.Router();

accidentReportRoutes.get('/sync-submitted', accidentReportController.syncSubmittedReports);
accidentReportRoutes.get('/last-approved', accidentReportController.getLastApprovedReport);
accidentReportRoutes.get('/last-rejected', accidentReportController.getLastRejectedReport);
