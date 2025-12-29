import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
        profileId?: string;
        isAdmin?: boolean;
      } & JwtPayload;
      apiKey?: {
        id: string;
        name: string;
        permissions: string[];
      };
      csrfToken?: string;
    }
  }
}

export {};
