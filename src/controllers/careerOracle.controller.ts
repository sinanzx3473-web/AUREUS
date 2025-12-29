import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { careerOracleService } from '../services/careerOracle.service';
import { logger } from '../utils/logger';

/**
 * Generate career prophecy for a user
 */
export const generateProphecy = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    throw new AppError('Wallet address is required', 400);
  }

  logger.info(`Generating career prophecy for ${address}`);

  const prophecy = await careerOracleService.generateCareerProphecy(address);

  res.json({
    success: true,
    data: prophecy,
  });
});

/**
 * Get radar chart comparison data
 */
export const getRadarData = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    throw new AppError('Wallet address is required', 400);
  }

  const radarData = await careerOracleService.getRadarChartData(address);

  res.json({
    success: true,
    data: radarData,
  });
});
