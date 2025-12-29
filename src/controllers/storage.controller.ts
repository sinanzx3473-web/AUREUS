import { Request, Response } from 'express';
import storageService, { MetadataUpload } from '../services/storage.service';
import { logger } from '../utils/logger';
import { query } from '../config/database';

/**
 * Upload skill metadata to decentralized storage
 */
export const uploadSkillMetadata = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { skillId, name, description, category, evidence, attributes } = req.body;

    if (!skillId || !name || !description) {
      return res.status(400).json({
        success: false,
        error: 'skillId, name, and description are required',
      });
    }

    const metadata: MetadataUpload = {
      name,
      description,
      category,
      evidence,
      attributes: attributes || {},
      skillId,
      timestamp: new Date().toISOString(),
    };

    const result = await storageService.uploadMetadata(metadata);

    // Store metadata reference in database
    await query(
      `UPDATE skills 
       SET metadata = jsonb_set(metadata, '{storage}', $1::jsonb)
       WHERE skill_id = $2`,
      [JSON.stringify(result), skillId]
    );

    logger.info(`Skill metadata uploaded for skill ${skillId}: ${result.cid || result.arweaveId}`);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error uploading skill metadata', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload metadata',
    });
  }
};

/**
 * Upload profile metadata to decentralized storage
 */
export const uploadProfileMetadata = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { profileId, name, bio, avatar, socialLinks, attributes } = req.body;

    if (!profileId || !name) {
      return res.status(400).json({
        success: false,
        error: 'profileId and name are required',
      });
    }

    const metadata: MetadataUpload = {
      name,
      description: bio || '',
      image: avatar,
      attributes: {
        socialLinks: socialLinks || {},
        ...attributes,
      },
      profileId,
      timestamp: new Date().toISOString(),
    };

    const result = await storageService.uploadMetadata(metadata);

    // Store metadata reference in database
    await query(
      `UPDATE profiles 
       SET metadata = jsonb_set(metadata, '{storage}', $1::jsonb)
       WHERE profile_id = $2`,
      [JSON.stringify(result), profileId]
    );

    logger.info(`Profile metadata uploaded for profile ${profileId}: ${result.cid || result.arweaveId}`);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error uploading profile metadata', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload metadata',
    });
  }
};

/**
 * Upload file (image, document) to IPFS
 */
export const uploadFile = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const result = await storageService.uploadFileToIPFS(
      req.file.buffer,
      req.file.originalname
    );

    logger.info(`File uploaded: ${result.cid}`);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error uploading file', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
};

/**
 * Retrieve metadata from storage
 */
export const getMetadata = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { cid, arweaveId } = req.query;

    if (!cid && !arweaveId) {
      return res.status(400).json({
        success: false,
        error: 'Either cid or arweaveId is required',
      });
    }

    let metadata;
    if (cid) {
      metadata = await storageService.getFromIPFS(cid as string);
    } else if (arweaveId) {
      metadata = await storageService.getFromArweave(arweaveId as string);
    }

    return res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    logger.error('Error retrieving metadata', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve metadata',
    });
  }
};

/**
 * Pin content to IPFS
 */
export const pinContent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { cid } = req.body;

    if (!cid) {
      return res.status(400).json({
        success: false,
        error: 'CID is required',
      });
    }

    await storageService.pinToIPFS(cid);

    return res.json({
      success: true,
      message: 'Content pinned successfully',
    });
  } catch (error) {
    logger.error('Error pinning content', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to pin content',
    });
  }
};
