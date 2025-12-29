import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Staking', path: '/staking' },
    { name: 'Governance', path: '/governance' },
    { name: 'Bounties', path: '/bounties' },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
        isScrolled
          ? "bg-[#050505]/80 backdrop-blur-md border-b border-white/10 py-4"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* LOGO SECTOR */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-8 h-8 border border-white/20 rounded-sm group-hover:border-[#D4AF37] transition-colors">
            <Terminal className="w-4 h-4 text-white group-hover:text-[#D4AF37]" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tighter text-white">
            AUREUS<span className="text-[#D4AF37]">.</span>
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "font-mono text-xs uppercase tracking-[0.2em] transition-all hover:text-[#D4AF37]",
                location.pathname === link.path ? "text-[#D4AF37]" : "text-white/60"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* ACTIONS SECTOR */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <ConnectButton
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
              showBalance={false}
            />
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden text-white hover:text-[#D4AF37] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileOpen && (
        <div className="absolute top-full left-0 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 md:hidden flex flex-col p-6 gap-4 animate-in slide-in-from-top-5">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "font-mono text-sm uppercase tracking-widest transition-all py-2 border-l-2 pl-4",
                location.pathname === link.path
                  ? "text-[#D4AF37] border-[#D4AF37]"
                  : "text-white/70 border-transparent hover:text-[#D4AF37] hover:border-[#D4AF37]"
              )}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 mt-2 border-t border-white/10 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
