import { Request, Response } from 'express';
import { query } from '../config/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { PaginatedResponse, Skill } from '../types';

/**
 * Get all skills with pagination
 */
export const getSkills = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  const category = req.query.category as string;
  const verified = req.query.verified === 'true';

  let queryText = 'SELECT * FROM skills WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  if (category) {
    paramCount++;
    queryText += ` AND category = $${paramCount}`;
    params.push(category);
  }

  if (verified) {
    paramCount++;
    queryText += ` AND is_verified = $${paramCount}`;
    params.push(true);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${
    paramCount + 2
  }`;
  params.push(limit, offset);

  const result = await query(queryText, params);

  let countQuery = 'SELECT COUNT(*) FROM skills WHERE 1=1';
  const countParams: any[] = [];
  let countParamCount = 0;

  if (category) {
    countParamCount++;
    countQuery += ` AND category = $${countParamCount}`;
    countParams.push(category);
  }

  if (verified) {
    countParamCount++;
    countQuery += ` AND is_verified = $${countParamCount}`;
    countParams.push(true);
  }

  const countResult = await query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  const response: PaginatedResponse<Skill> = {
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
 * Get skill by ID
 */
export const getSkillById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM skills WHERE skill_id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Skill not found', 404);
  }

  res.json({ success: true, data: result.rows[0] });
});

/**
 * Get skills by profile
 */
export const getSkillsByProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { profileId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM skills 
       WHERE profile_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM skills WHERE profile_id = $1',
      [profileId]
    );

    const total = parseInt(countResult.rows[0].count);

    const response: PaginatedResponse<Skill> = {
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
 * Get skill with endorsements
 */
export const getSkillWithEndorsements = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const skillResult = await query('SELECT * FROM skills WHERE skill_id = $1', [
      id,
    ]);

    if (skillResult.rows.length === 0) {
      throw new AppError('Skill not found', 404);
    }

    const endorsementsResult = await query(
      'SELECT * FROM endorsements WHERE skill_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...skillResult.rows[0],
        endorsements: endorsementsResult.rows,
      },
    });
  }
);

/**
 * Search skills
 */
export const searchSkills = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  if (!q) {
    throw new AppError('Search query required', 400);
  }

  const result = await query(
    `SELECT * FROM skills 
     WHERE skill_name ILIKE $1 OR description ILIKE $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [`%${q}%`, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM skills 
     WHERE skill_name ILIKE $1 OR description ILIKE $1`,
    [`%${q}%`]
  );

  const total = parseInt(countResult.rows[0].count);

  const response: PaginatedResponse<Skill> = {
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
 * Get skill categories
 */
export const getSkillCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await query(
      `SELECT category, COUNT(*) as count 
       FROM skills 
       WHERE category IS NOT NULL 
       GROUP BY category 
       ORDER BY count DESC`
    );

    res.json({ success: true, data: result.rows });
  }
);
