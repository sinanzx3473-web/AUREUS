import { Router } from 'express';
import * as profileController from '../controllers/profile.controller';
import { sanitizePagination } from '../middleware/validation';
import { apiLimiter, searchLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply general rate limiting to all profile routes
router.use(apiLimiter);

/**
 * @route   GET /api/v1/profiles
 * @desc    Get all profiles with pagination
 * @access  Public
 */
router.get('/', sanitizePagination, profileController.getProfiles);

/**
 * @route   GET /api/v1/profiles/search
 * @desc    Search profiles
 * @access  Public
 */
router.get('/search', searchLimiter, sanitizePagination, profileController.searchProfiles);

/**
 * @route   GET /api/v1/profiles/address/:address
 * @desc    Get profile by wallet address
 * @access  Public
 */
router.get('/address/:address', profileController.getProfileByAddress);

/**
 * @route   GET /api/v1/profiles/address/:address/skills
 * @desc    Get profile with all skills
 * @access  Public
 */
router.get('/address/:address/skills', profileController.getProfileWithSkills);

/**
 * @route   GET /api/v1/profiles/address/:address/stats
 * @desc    Get profile statistics
 * @access  Public
 */
router.get('/address/:address/stats', profileController.getProfileStats);

/**
 * @route   GET /api/v1/profiles/:id
 * @desc    Get profile by ID
 * @access  Public
 */
router.get('/:id', profileController.getProfileById);

export default router;
