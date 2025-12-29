import { Router } from 'express';
import * as skillController from '../controllers/skill.controller';
import { sanitizePagination } from '../middleware/validation';
import { apiLimiter, searchLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply general rate limiting to all skill routes
router.use(apiLimiter);

/**
 * @route   GET /api/v1/skills
 * @desc    Get all skills with pagination and filters
 * @access  Public
 */
router.get('/', sanitizePagination, skillController.getSkills);

/**
 * @route   GET /api/v1/skills/search
 * @desc    Search skills
 * @access  Public
 */
router.get('/search', searchLimiter, sanitizePagination, skillController.searchSkills);

/**
 * @route   GET /api/v1/skills/categories
 * @desc    Get skill categories with counts
 * @access  Public
 */
router.get('/categories', skillController.getSkillCategories);

/**
 * @route   GET /api/v1/skills/profile/:profileId
 * @desc    Get skills by profile ID
 * @access  Public
 */
router.get(
  '/profile/:profileId',
  sanitizePagination,
  skillController.getSkillsByProfile
);

/**
 * @route   GET /api/v1/skills/:id
 * @desc    Get skill by ID
 * @access  Public
 */
router.get('/:id', skillController.getSkillById);

/**
 * @route   GET /api/v1/skills/:id/endorsements
 * @desc    Get skill with all endorsements
 * @access  Public
 */
router.get('/:id/endorsements', skillController.getSkillWithEndorsements);

export default router;
