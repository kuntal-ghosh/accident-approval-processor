import express from 'express';
import * as criteriaController from '../controllers/criteria.controller';

export const criteriaRoutes = express.Router();

criteriaRoutes.get('/extract', criteriaController.extractCriteria);
criteriaRoutes.post('/', criteriaController.saveCriteria);
criteriaRoutes.get('/active', criteriaController.getActiveCriteria);
criteriaRoutes.get('/versions', criteriaController.getAllCriteriaVersions);
