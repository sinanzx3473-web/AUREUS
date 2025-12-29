import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navLinks = [
    { path: '/app', label: 'Dashboard' },
    { path: '/profile', label: 'My Profile' },
    { path: '/claims', label: 'Claims' },
    { path: '/endorsements', label: 'Endorsements' },
  ];

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-md fixed top-0 left-0 right-0 z-50" role="banner">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-aureus font-serif" aria-label="AUREUS logo">AUREUS</h1>
            </Link>
            <nav role="navigation" aria-label="Main navigation" className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-xs font-mono uppercase tracking-widest transition-colors hover:text-aureus",
                    location.pathname === link.path
                      ? "text-aureus"
                      : "text-electric-alabaster/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <nav role="navigation" aria-label="Wallet connection" className="hidden sm:block">
              <ConnectButton />
            </nav>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-w-[44px] min-h-[44px] text-electric-alabaster hover:text-aureus"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav 
            role="navigation" 
            aria-label="Mobile navigation" 
            className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-xs font-mono uppercase tracking-widest transition-colors hover:text-aureus px-4 py-3 min-h-[44px] flex items-center",
                    location.pathname === link.path
                      ? "text-aureus bg-aureus/10 border border-aureus/20"
                      : "text-electric-alabaster/60 hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="sm:hidden pt-2 border-t border-white/10">
                <ConnectButton />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
