import { Router } from 'express';
import { generateProphecy, getRadarData } from '../controllers/careerOracle.controller';

const router = Router();

/**
 * @route   GET /api/v1/career-oracle/:address/prophecy
 * @desc    Generate AI-powered career trajectory prediction
 * @access  Public
 */
router.get('/:address/prophecy', generateProphecy);

/**
 * @route   GET /api/v1/career-oracle/:address/radar
 * @desc    Get radar chart data for market comparison
 * @access  Public
 */
router.get('/:address/radar', getRadarData);

export default router;
