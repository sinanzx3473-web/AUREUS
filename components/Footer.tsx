import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Social Links
  const socials = [
    {
      name: 'X (Twitter)',
      href: 'https://twitter.com',
      path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
    },
    {
      name: 'GitHub',
      href: 'https://github.com',
      path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
    },
    {
      name: 'Discord',
      href: 'https://discord.com',
      path: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z'
    }
  ];

  // Navigation Columns
  const links = {
    product: [
      { name: 'Dashboard', href: '/app' },
      { name: 'My Profile', href: '/profile' },
      { name: 'Claims', href: '/claims' },
      { name: 'Endorsements', href: '/endorsements' },
    ],
    resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'Smart Contracts', href: 'https://github.com/your-repo/contracts', external: true },
      { name: 'Security Audit', href: '/security' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ]
  };

  return (
    <footer className="border-t border-white/10 bg-void py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="block">
              <h2 className="text-3xl font-serif text-white tracking-tight">
                AUREUS<span className="text-primary">.</span>
              </h2>
            </Link>
            <p className="text-white/60 text-sm font-mono leading-relaxed max-w-xs">
              The sovereign protocol for professional identity. built on Ethereum. Verified by AI. Secured by Zero-Knowledge.
            </p>
            
            {/* System Status Indicator (Replaces broken badges) */}
            <div className="flex items-center space-x-2 bg-white/5 w-fit px-3 py-1.5 rounded-full border border-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-emerald-400">SYSTEM OPERATIONAL</span>
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-6">Platform</h3>
            <ul className="space-y-4">
              {links.product.map((item) => (
                <li key={item.name}>
                  <Link to={item.href} className="text-white/60 hover:text-primary transition-colors text-sm">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest mb-6">Developers</h3>
            <ul className="space-y-4">
              {links.resources.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-primary transition-colors text-sm flex items-center gap-2">
                      {item.name} ↗
                    </a>
                  ) : (
                    <Link to={item.href} className="text-white/60 hover:text-primary transition-colors text-sm">
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / Socials */}
          <div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-widest mb-6">Stay Sovereign</h3>
            <div className="flex space-x-4">
              {socials.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-black transition-all duration-300 hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:-translate-y-1"
                >
                  <span className="sr-only">{item.name}</span>
                  <svg
                    className="w-4 h-4 text-white/60 group-hover:text-[#D4AF37] transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d={item.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-xs font-mono">
            © {currentYear} AUREUS PROTOCOL. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-6">
            {links.legal.map(item => (
              <Link key={item.name} to={item.href} className="text-white/40 hover:text-white text-xs font-mono">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
