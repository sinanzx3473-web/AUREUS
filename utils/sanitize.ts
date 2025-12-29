import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify to remove malicious scripts and attributes
 */

/**
 * Sanitize user-generated HTML content
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML safe for rendering
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'code', 'pre', 'blockquote'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  });
};

/**
 * Sanitize plain text (strip all HTML)
 * @param dirty - Untrusted string that may contain HTML
 * @returns Plain text with all HTML removed
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize user profile data
 * @param profile - User profile object with potentially unsafe content
 * @returns Sanitized profile object
 */
export const sanitizeProfile = (profile: {
  name?: string;
  bio?: string;
  [key: string]: any;
}): typeof profile => {
  return {
    ...profile,
    name: profile.name ? sanitizeText(profile.name) : '',
    bio: profile.bio ? sanitizeHtml(profile.bio) : '',
  };
};

/**
 * Sanitize skill data
 * @param skill - Skill object with potentially unsafe content
 * @returns Sanitized skill object
 */
export const sanitizeSkill = (skill: {
  name?: string;
  description?: string;
  [key: string]: any;
}): typeof skill => {
  return {
    ...skill,
    name: skill.name ? sanitizeText(skill.name) : '',
    description: skill.description ? sanitizeHtml(skill.description) : '',
  };
};

/**
 * Sanitize endorsement data
 * @param endorsement - Endorsement object with potentially unsafe content
 * @returns Sanitized endorsement object
 */
export const sanitizeEndorsement = (endorsement: {
  message?: string;
  skillName?: string;
  [key: string]: any;
}): typeof endorsement => {
  return {
    ...endorsement,
    skillName: endorsement.skillName ? sanitizeText(endorsement.skillName) : '',
    message: endorsement.message ? sanitizeHtml(endorsement.message) : '',
  };
};

/**
 * Sanitize array of objects
 * @param items - Array of objects to sanitize
 * @param sanitizer - Sanitizer function to apply to each item
 * @returns Array of sanitized objects
 */
export const sanitizeArray = <T>(
  items: T[],
  sanitizer: (item: T) => T
): T[] => {
  return items.map(sanitizer);
};

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 * @param url - Untrusted URL string
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  
  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }
  
  // Allow http, https, and relative URLs
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('./')
  ) {
    return trimmed;
  }
  
  // Default to https for domain-only URLs
  if (!lower.includes(':')) {
    return `https://${trimmed}`;
  }
  
  return '';
}
