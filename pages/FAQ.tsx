import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Wallet, Shield, Database, Code, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">


      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-white tracking-tight">
            AUREUS
          </h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-400">
            Everything you need to know about AUREUS
          </p>
        </div>

        {/* General Questions */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-blue-400" />
              <CardTitle className="text-2xl">General Questions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is AUREUS?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  AUREUS is a decentralized skill verification platform built on Ethereum-compatible blockchains. 
                  It allows professionals to create verifiable skill profiles, claim skills with proof, and receive 
                  endorsements from trusted verifiers. All credentials are stored on-chain and backed by decentralized 
                  storage (IPFS/Arweave).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Why blockchain for skill verification?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Traditional skill verification systems are centralized, prone to fraud, and lack portability. 
                  Blockchain provides:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Immutability</strong>: Skills and endorsements cannot be altered or deleted</li>
                    <li><strong>Transparency</strong>: All verifications are publicly auditable</li>
                    <li><strong>Portability</strong>: Your credentials follow you across platforms</li>
                    <li><strong>Decentralization</strong>: No single entity controls your professional identity</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Which networks does AUREUS support?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Currently supported networks:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ethereum Sepolia (testnet)</li>
                    <li>Polygon Mumbai (testnet)</li>
                    <li>Polygon Mainnet (production)</li>
                    <li>Ethereum Mainnet (production - coming soon)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Is my data private?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  AUREUS uses a hybrid approach:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>On-chain</strong>: Profile metadata hashes, skill claims, endorsement records</li>
                    <li><strong>Off-chain</strong>: Detailed metadata stored on IPFS/Arweave (encrypted if needed)</li>
                    <li><strong>Private</strong>: Personal information is never stored on-chain without encryption</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Wallet & Technical */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-purple-400" />
              <CardTitle className="text-2xl">Wallet & Technical</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I connect my wallet?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click "Connect Wallet" in the header</li>
                    <li>Select your wallet provider (MetaMask, WalletConnect, Coinbase Wallet, etc.)</li>
                    <li>Approve the connection request</li>
                    <li>Sign the authentication message to generate your JWT token</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What wallets are supported?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  AUREUS uses RainbowKit, supporting 50+ wallets including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>MetaMask</li>
                    <li>WalletConnect</li>
                    <li>Coinbase Wallet</li>
                    <li>Rainbow Wallet</li>
                    <li>Trust Wallet</li>
                    <li>And many more...</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Do I need cryptocurrency to use AUREUS?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes, you need gas tokens (ETH, MATIC) to pay for transactions. Approximate costs:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Create Profile: 0.001-0.01 ETH/MATIC</li>
                    <li>Claim Skill: 0.0005-0.005 ETH/MATIC</li>
                    <li>Endorse: 0.0003-0.003 ETH/MATIC</li>
                  </ul>
                  Testnet tokens are free from faucets for testing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>What happens if I lose my wallet?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  <strong className="text-red-400">Critical:</strong> Your wallet is your identity on AUREUS. 
                  If you lose access:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>You cannot recover your profile without the private key</li>
                    <li>All skills and endorsements remain on-chain but inaccessible</li>
                    <li><strong>Always backup your seed phrase securely</strong></li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Skills & Profiles */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-green-400" />
              <CardTitle className="text-2xl">Skills & Profiles</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I create a profile?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Connect your wallet</li>
                    <li>Navigate to "Create Profile"</li>
                    <li>Fill in your name and bio</li>
                    <li>Upload metadata to IPFS (automatic)</li>
                    <li>Confirm the transaction</li>
                    <li>Wait for blockchain confirmation</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What is a skill claim?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  A skill claim is your declaration of proficiency in a specific area. It includes:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Skill name and category</li>
                    <li>Proficiency level (Beginner, Intermediate, Advanced, Expert)</li>
                    <li>Evidence URI (certificates, portfolio, GitHub, etc.)</li>
                    <li>Metadata stored on IPFS</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>How do endorsements work?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Endorsements are verifications from trusted parties:
                  <ol className="list-decimal list-inside space-y-1">
                    <li>A verifier reviews your skill claim</li>
                    <li>They submit an endorsement transaction</li>
                    <li>The endorsement is recorded on-chain</li>
                    <li>Your skill credibility increases</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Can I remove a skill claim?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  No. Once a skill claim is on-chain, it's permanent. However:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>You can add new claims with updated information</li>
                    <li>Endorsements provide context and validation</li>
                    <li>The timestamp shows when claims were made</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-yellow-400" />
              <CardTitle className="text-2xl">Storage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is IPFS?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  IPFS (InterPlanetary File System) is a decentralized storage network:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Content-addressed (files identified by hash)</li>
                    <li>Distributed across multiple nodes</li>
                    <li>Censorship-resistant</li>
                    <li>Permanent (if pinned)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What is Arweave?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Arweave is a permanent storage blockchain:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Pay once, store forever</li>
                    <li>Cryptographically verified</li>
                    <li>Decentralized and immutable</li>
                    <li>Higher cost than IPFS but guaranteed permanence</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Which storage should I use?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  <p className="mb-2"><strong>IPFS</strong>: For most use cases (profiles, skill metadata)</p>
                  <ul className="list-disc list-inside space-y-1 mb-3">
                    <li>Fast and free (public gateways)</li>
                    <li>Requires pinning for permanence</li>
                    <li>Good for frequently updated data</li>
                  </ul>
                  <p className="mb-2"><strong>Arweave</strong>: For critical, permanent records</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>One-time payment</li>
                    <li>Guaranteed permanence</li>
                    <li>Best for certificates, diplomas, legal documents</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-400" />
              <CardTitle className="text-2xl">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is AUREUS secure?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  AUREUS implements multiple security layers:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Smart contracts</strong>: Audited, upgradeable, pausable</li>
                    <li><strong>Access control</strong>: Role-based permissions</li>
                    <li><strong>Rate limiting</strong>: DDoS protection</li>
                    <li><strong>Input validation</strong>: Prevents injection attacks</li>
                    <li><strong>Monitoring</strong>: Real-time alerts for suspicious activity</li>
                  </ul>
                  <p className="mt-2">See <Button variant="link" className="p-0 h-auto text-blue-400" onClick={() => navigate('/security')}>Security Guide</Button> for full audit.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What if a vulnerability is found?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Report security issues to: <strong>security@takumi.example.com</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Do not disclose publicly</li>
                    <li>Provide detailed reproduction steps</li>
                    <li>Responsible disclosure policy applies</li>
                    <li>Bug bounty program available</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Can contracts be upgraded?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Yes, using UUPS proxy pattern:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Only admin can upgrade</li>
                    <li>48-hour timelock for upgrades</li>
                    <li>Emergency pause function</li>
                    <li>Rollback capability</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-orange-400" />
              <CardTitle className="text-2xl">Troubleshooting</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Transaction failed - what do I do?</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Common causes:
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li><strong>Insufficient gas</strong>: Increase gas limit</li>
                    <li><strong>Nonce too low</strong>: Reset account in wallet</li>
                    <li><strong>Contract paused</strong>: Wait for unpause</li>
                    <li><strong>Invalid input</strong>: Check form validation</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>My profile isn't showing up</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Possible reasons:
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Transaction still pending (check block explorer)</li>
                    <li>Backend indexer lag (wait 1-2 minutes)</li>
                    <li>Cache issue (clear browser cache)</li>
                    <li>Wrong network selected (check wallet network)</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>I can't connect my wallet</AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Troubleshooting steps:
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Refresh the page</li>
                    <li>Check wallet is unlocked</li>
                    <li>Verify correct network selected</li>
                    <li>Clear browser cache</li>
                    <li>Try different browser</li>
                    <li>Update wallet extension</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Still have questions?</CardTitle>
            <CardDescription>Get help from our community and support team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => navigate('/docs')} className="justify-start">
                Documentation
              </Button>
              <Button variant="outline" onClick={() => navigate('/help')} className="justify-start">
                Help Center
              </Button>
              <Button variant="outline" onClick={() => window.open('https://github.com/takumi-platform/issues', '_blank')} className="justify-start">
                GitHub Issues
              </Button>
              <Button variant="outline" onClick={() => window.open('https://discord.gg/takumi', '_blank')} className="justify-start">
                Discord Community
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} AUREUS PROTOCOL. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};
