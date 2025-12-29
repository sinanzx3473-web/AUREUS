import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface AnimatedButtonProps {
  children: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

const scrambleText = (text: string, progress: number): string => {
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = text.length;
  const revealCount = Math.floor(length * progress);
  
  return text
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' ';
      if (i < revealCount) return text[i];
      return chars[Math.floor(Math.random() * chars.length)];
    })
    .join('');
};

export default function AnimatedButton({
  children,
  onClick,
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
}: AnimatedButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [displayText, setDisplayText] = useState(children);
  const [glarePosition, setGlarePosition] = useState(0);

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(children);
      return;
    }

    let frame = 0;
    const totalFrames = 15;
    
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      
      if (frame >= totalFrames) {
        setDisplayText(children);
        clearInterval(interval);
      } else {
        setDisplayText(scrambleText(children, progress));
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered, children]);

  useEffect(() => {
    if (!isHovered) return;

    const interval = setInterval(() => {
      setGlarePosition((prev) => (prev >= 100 ? 0 : prev + 5));
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <motion.div
      className="relative inline-block"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={onClick}
        className={`relative overflow-hidden ${className}`}
        variant={variant}
        size={size}
        disabled={disabled}
      >
        {/* Glare effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent ${glarePosition - 20}%, rgba(212, 175, 55, 0.4) ${glarePosition}%, transparent ${glarePosition + 20}%)`,
            }}
          />
        )}
        
        <span className="relative z-10 font-mono tracking-wider">
          {displayText}
        </span>
      </Button>
    </motion.div>
  );
}
