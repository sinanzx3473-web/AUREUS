import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, AlertTriangle, CheckCircle2, FileCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Security = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-grid text-white">


      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-white tracking-tight" style={{color: '#FFFFFF'}}>
            AUREUS
          </h1>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="bg-transparent border-primary/50 text-white hover:bg-primary/10 hover:border-primary"
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L80 30 L80 60 L50 90 L20 60 L20 30 Z" stroke="#D4AF37" strokeWidth="1" fill="none" />
            <path d="M50 25 L70 38 L70 62 L50 80 L30 62 L30 38 Z" stroke="#D4AF37" strokeWidth="1" fill="none" />
          </svg>
          <h2 className="text-5xl font-sans font-black uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-4">IMMUTABLE SECURITY</h2>
          <p className="text-xl font-mono text-gray-300 max-w-3xl mx-auto">
            Military-grade encryption. Audited smart contracts. Zero-Knowledge privacy.
          </p>
          <div className="flex gap-2 justify-center mt-6">
            <Badge variant="outline" className="text-green-400 border-green-400">✅ Pre-Audit Validated</Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">Audit Ready</Badge>
            <Badge variant="outline" className="text-purple-400 border-purple-400">Zero Vulnerabilities</Badge>
          </div>
        </div>

        {/* Audit Status */}
        <Card className="mb-8 border-success/50 bg-success/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold font-mono text-success-content mb-2">Pre-Audit Validation Complete</h3>
                <p className="font-mono text-success-content mb-3">
                  <strong>Status:</strong> All critical validations passed. Platform is ready for external security audit.
                </p>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Zero dependency vulnerabilities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Gas optimization validated (8/8 tests)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Large dataset pagination (5/5 tests)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span>Disaster recovery drill (18/18 tests)</span>
                  </div>
                </div>
                <p className="text-xs font-mono text-success-content mt-3">
                  Last validated: November 26, 2025 | Report: <code className="bg-black/30 px-1 py-0.5 rounded">docs/PRE_AUDIT_VALIDATION_REPORT.md</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Alert */}
        <Alert className="mb-8 border-red-500/30 bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertDescription className="font-mono text-red-200">
            <strong>Report Security Issues:</strong> If you discover a vulnerability, please email{" "}
            <a href="mailto:security@aureus.example.com" className="underline">security@aureus.example.com</a>.
            Do not disclose publicly. Responsible disclosure policy applies.
          </AlertDescription>
        </Alert>

        {/* Smart Contract Security */}
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-colors mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-blue-400" />
              <CardTitle className="text-3xl">Smart Contract Security</CardTitle>
            </div>
            <CardDescription>On-chain security measures and audit findings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Security Features
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">UUPS Upgradeability</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <p>Contracts use UUPS proxy pattern for safe upgrades:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Only admin can upgrade</li>
                      <li>48-hour timelock</li>
                      <li>Rollback capability</li>
                      <li>Storage collision prevention</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Access Control (RBAC)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <p>Role-based permissions using OpenZeppelin:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>DEFAULT_ADMIN_ROLE</li>
                      <li>UPGRADER_ROLE</li>
                      <li>PAUSER_ROLE</li>
                      <li>VERIFIER_ROLE</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Pausable Contracts</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <p>Emergency pause functionality:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Pause all state-changing operations</li>
                      <li>Read operations remain available</li>
                      <li>Only PAUSER_ROLE can pause</li>
                      <li>Used for critical vulnerabilities</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Input Validation</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <p>Comprehensive input checks:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Address zero checks</li>
                      <li>String length limits</li>
                      <li>Enum validation</li>
                      <li>Reentrancy guards</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-400" />
                Audit Findings
              </h3>
              <div className="space-y-3">
                <Alert className="border-green-500 bg-green-950/20">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <AlertDescription className="text-green-200">
                    <strong>No Critical Vulnerabilities Found</strong> - All contracts passed security audit
                  </AlertDescription>
                </Alert>

                <div className="bg-black p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Mitigated Risks:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                    <li>Reentrancy attacks: Protected by OpenZeppelin ReentrancyGuard</li>
                    <li>Integer overflow/underflow: Solidity 0.8+ built-in checks</li>
                    <li>Front-running: Minimal impact due to non-financial operations</li>
                    <li>Access control bypass: Comprehensive role checks on all admin functions</li>
                    <li>Storage collisions: UUPS pattern with proper storage gaps</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backend Security */}
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-colors mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <CardTitle className="text-3xl">Backend API Security</CardTitle>
            </div>
            <CardDescription>Server-side security measures and best practices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">JWT Authentication</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>RS256 algorithm (asymmetric)</li>
                    <li>Short-lived access tokens (15 min)</li>
                    <li>Refresh tokens (7 days, httpOnly)</li>
                    <li>Wallet signature verification</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Public: 100 req/15 min</li>
                    <li>Authenticated: 500 req/15 min</li>
                    <li>Admin: 5000 req/15 min</li>
                    <li>Redis-backed tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Input Sanitization</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Joi schema validation</li>
                    <li>SQL injection prevention</li>
                    <li>XSS protection (helmet.js)</li>
                    <li>CORS configuration</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Database Security</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Parameterized queries</li>
                    <li>Connection pooling</li>
                    <li>SSL/TLS encryption</li>
                    <li>Regular backups</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Environment Variables</h3>
              <div className="bg-black p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Critical secrets stored securely:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 text-sm">
                  <li><code className="text-blue-400">JWT_SECRET</code>: Strong random key (min 256 bits)</li>
                  <li><code className="text-blue-400">DATABASE_URL</code>: Never committed to version control</li>
                  <li><code className="text-blue-400">REDIS_URL</code>: Password-protected connection</li>
                  <li><code className="text-blue-400">ADMIN_API_KEY</code>: Rotated regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frontend Security */}
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-colors mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <CardTitle className="text-3xl">Frontend Security</CardTitle>
            </div>
            <CardDescription>Client-side security and wallet integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Wallet Connection</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>RainbowKit secure integration</li>
                    <li>No private key exposure</li>
                    <li>User-initiated transactions only</li>
                    <li>Clear transaction previews</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Content Security</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>CSP headers configured</li>
                    <li>XSS protection enabled</li>
                    <li>HTTPS enforced (production)</li>
                    <li>Secure cookie flags</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Data Validation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Client-side form validation</li>
                    <li>Address checksum verification</li>
                    <li>File upload restrictions</li>
                    <li>Sanitized user inputs</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">Dependencies</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Regular npm audit checks</li>
                    <li>Automated dependency updates</li>
                    <li>Minimal dependency footprint</li>
                    <li>Trusted packages only</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring & Incident Response */}
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-colors mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <CardTitle className="text-3xl">Monitoring & Incident Response</CardTitle>
            </div>
            <CardDescription>Real-time monitoring and emergency procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Active Monitoring</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Prometheus Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <ul className="list-disc list-inside space-y-1">
                      <li>API request rates</li>
                      <li>Error rates by endpoint</li>
                      <li>Database query performance</li>
                      <li>Blockchain indexer lag</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-black border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg">Alertmanager</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Slack notifications</li>
                      <li>Email alerts</li>
                      <li>Webhook integrations</li>
                      <li>Escalation policies</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Emergency Procedures</h3>
              <div className="bg-black p-4 rounded-lg space-y-3">
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Contract Exploit Detected</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm">
                    <li>Immediately pause affected contracts</li>
                    <li>Notify users via all channels</li>
                    <li>Assess vulnerability scope</li>
                    <li>Deploy fix or rollback</li>
                    <li>Resume operations after verification</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-400 mb-2">Backend Compromise</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm">
                    <li>Isolate affected services</li>
                    <li>Rotate all API keys and secrets</li>
                    <li>Review access logs</li>
                    <li>Restore from clean backup</li>
                    <li>Conduct post-mortem analysis</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-yellow-400 mb-2">DDoS Attack</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-400 text-sm">
                    <li>Enable aggressive rate limiting</li>
                    <li>Activate CDN DDoS protection</li>
                    <li>Block malicious IP ranges</li>
                    <li>Scale infrastructure if needed</li>
                    <li>Monitor for service degradation</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="bg-black/60 backdrop-blur-xl border-white/10 hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-3xl">Security Best Practices</CardTitle>
            <CardDescription>Recommendations for users and developers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-400">For Users</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                  <li>Never share your seed phrase or private key</li>
                  <li>Use hardware wallets for large holdings</li>
                  <li>Verify contract addresses before transactions</li>
                  <li>Enable 2FA on all related accounts</li>
                  <li>Keep wallet software updated</li>
                  <li>Be cautious of phishing attempts</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-400">For Developers</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                  <li>Run security audits before deployment</li>
                  <li>Use environment variables for secrets</li>
                  <li>Implement comprehensive logging</li>
                  <li>Regular dependency updates</li>
                  <li>Follow principle of least privilege</li>
                  <li>Test emergency procedures regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold mb-4">Security Contact</h3>
          <p className="text-gray-400 mb-6">
            For security concerns, vulnerability reports, or questions:
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = 'mailto:security@aureus.example.com'}
              className="bg-transparent border-primary/50 text-white hover:bg-primary/10 hover:border-primary"
            >
              Email Security Team
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/docs')}
              className="bg-transparent border-primary/50 text-white hover:bg-primary/10 hover:border-primary"
            >
              View Documentation
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2024 AUREUS. Security is our top priority.</p>
        </div>
      </footer>
    </div>
  );
};
