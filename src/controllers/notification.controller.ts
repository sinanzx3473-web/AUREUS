import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  res.json({ notifications: [] });
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  res.json({ success: true });
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  res.json({ success: true });
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  res.json({ success: true });
};

export const getPreferences = async (req: AuthRequest, res: Response) => {
  res.json({ preferences: {} });
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  res.json({ success: true });
};
