import { Request, Response } from 'express';
import { query } from '../config/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { PaginatedResponse, Profile } from '../types';

/**
 * Get all profiles with pagination
 */
export const getProfiles = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT * FROM profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await query('SELECT COUNT(*) FROM profiles');
  const total = parseInt(countResult.rows[0].count);

  const response: PaginatedResponse<Profile> = {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  res.json({ success: true, ...response });
});

/**
 * Get profile by wallet address
 */
export const getProfileByAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { address } = req.params;

    const result = await query(
      'SELECT * FROM profiles WHERE wallet_address = $1',
      [address.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    res.json({ success: true, data: result.rows[0] });
  }
);

/**
 * Get profile by ID
 */
export const getProfileById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query('SELECT * FROM profiles WHERE profile_id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    res.json({ success: true, data: result.rows[0] });
  }
);

/**
 * Get profile with skills
 */
export const getProfileWithSkills = asyncHandler(
  async (req: Request, res: Response) => {
    const { address } = req.params;

    const profileResult = await query(
      'SELECT * FROM profiles WHERE wallet_address = $1',
      [address.toLowerCase()]
    );

    if (profileResult.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    const profile = profileResult.rows[0];

    const skillsResult = await query(
      'SELECT * FROM skills WHERE profile_id = $1 ORDER BY created_at DESC',
      [profile.profile_id]
    );

    res.json({
      success: true,
      data: {
        ...profile,
        skills: skillsResult.rows,
      },
    });
  }
);

/**
 * Search profiles
 */
export const searchProfiles = asyncHandler(
  async (req: Request, res: Response) => {
    const { q } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!q) {
      throw new AppError('Search query required', 400);
    }

    const result = await query(
      `SELECT * FROM profiles 
       WHERE name ILIKE $1 OR bio ILIKE $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM profiles WHERE name ILIKE $1 OR bio ILIKE $1`,
      [`%${q}%`]
    );

    const total = parseInt(countResult.rows[0].count);

    const response: PaginatedResponse<Profile> = {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json({ success: true, ...response });
  }
);

/**
 * Get profile statistics
 */
export const getProfileStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { address } = req.params;

    const profileResult = await query(
      'SELECT profile_id FROM profiles WHERE wallet_address = $1',
      [address.toLowerCase()]
    );

    if (profileResult.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    const profileId = profileResult.rows[0].profile_id;

    const [skillsCount, verifiedCount, endorsementsCount] = await Promise.all([
      query('SELECT COUNT(*) FROM skills WHERE profile_id = $1', [profileId]),
      query(
        'SELECT COUNT(*) FROM skills WHERE profile_id = $1 AND is_verified = true',
        [profileId]
      ),
      query(
        `SELECT COUNT(*) FROM endorsements e 
         JOIN skills s ON e.skill_id = s.skill_id 
         WHERE s.profile_id = $1`,
        [profileId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalSkills: parseInt(skillsCount.rows[0].count),
        verifiedSkills: parseInt(verifiedCount.rows[0].count),
        totalEndorsements: parseInt(endorsementsCount.rows[0].count),
      },
    });
  }
);
