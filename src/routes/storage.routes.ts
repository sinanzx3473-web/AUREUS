import { Router } from 'express';
import multer from 'multer';
import {
  uploadSkillMetadata,
  uploadProfileMetadata,
  uploadFile,
  getMetadata,
  pinContent,
} from '../controllers/storage.controller';
import { authenticateJWT } from '../middleware/auth';
import { apiLimiter, uploadLimiter } from '../middleware/rateLimit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Apply general rate limiting to all storage routes
router.use(apiLimiter);

/**
 * @route   POST /api/v1/storage/skill
 * @desc    Upload skill metadata to IPFS/Arweave
 * @access  Private
 */
router.post('/skill', uploadLimiter, authenticateJWT, uploadSkillMetadata);

/**
 * @route   POST /api/v1/storage/profile
 * @desc    Upload profile metadata to IPFS/Arweave
 * @access  Private
 */
router.post('/profile', uploadLimiter, authenticateJWT, uploadProfileMetadata);

/**
 * @route   POST /api/v1/storage/file
 * @desc    Upload file to IPFS
 * @access  Private
 */
router.post('/file', uploadLimiter, authenticateJWT, upload.single('file'), uploadFile);

/**
 * @route   GET /api/v1/storage/metadata
 * @desc    Retrieve metadata from storage
 * @access  Public
 */
router.get('/metadata', getMetadata);

/**
 * @route   POST /api/v1/storage/pin
 * @desc    Pin content to IPFS
 * @access  Private
 */
router.post('/pin', uploadLimiter, authenticateJWT, pinContent);

export default router;
