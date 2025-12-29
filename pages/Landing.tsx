import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Users, Award, FileCheck, Zap, Globe, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tracePageView } from "@/utils/tracing";
import { LiquidGoldArtifact } from "@/components/hero/LiquidGoldArtifact";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { LiveTicker } from "@/components/marketing/LiveTicker";
import Navbar from "@/components/layout/Navbar";

export const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    tracePageView('Landing');
  }, []);

  return (
    <div className="min-h-screen bg-void text-white">
      {/* Navigation Bar */}
      <Navbar />
      {/* Hero Section */}
      <section 
        id="main-content"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        aria-label="Hero section"
      >
        {/* Cyber Grid Background */}
        <div className="absolute inset-0 bg-grid"></div>
        
        {/* 3D Liquid Gold Artifact Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <LiquidGoldArtifact />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pb-20">
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 
              className="text-7xl md:text-9xl font-sans font-black text-white leading-none tracking-tighter mb-6"
              aria-label="THE GOLD STANDARD"
            >
              THE GOLD STANDARD
            </h1>
            <h2 className="text-7xl md:text-9xl font-sans font-black text-gradient-gold leading-none tracking-tighter">
              OF HUMAN CAPITAL
            </h2>
          </motion.div>
          
          <motion.p 
            className="text-sm md:text-base text-white/50 mb-16 max-w-3xl mx-auto font-mono uppercase tracking-[0.3em]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            AI-VERIFIED • ZERO-KNOWLEDGE • UNSTOPPABLE
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          >
            <Button
              className="h-12 px-8 w-full sm:w-auto bg-primary/10 backdrop-blur-md border border-white/20 text-primary font-mono uppercase tracking-wider hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
              onClick={() => navigate('/app')}
            >
              PROVE YOUR WORTH
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 w-full sm:w-auto bg-transparent backdrop-blur-md border border-white/20 text-white font-mono uppercase tracking-wider hover:bg-white/10 hover:border-white/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              onClick={() => navigate('/app')}
            >
              EXPLORE PLATFORM
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative z-10 bg-gradient-to-b from-transparent to-black/50" aria-label="Features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-mono uppercase tracking-wider">
              PLATFORM FEATURES
            </Badge>
            <h2 className="text-4xl md:text-5xl font-sans font-black text-white mb-4 tracking-tight">
              Built for the Future of Work
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto font-mono">
              Decentralized. Verifiable. Sovereign.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Zero-Knowledge Proofs",
                description: "Prove your skills without revealing sensitive information. Privacy-first verification."
              },
              {
                icon: CheckCircle2,
                title: "AI-Powered Verification",
                description: "Advanced AI agents validate your claims with rigorous testing and analysis."
              },
              {
                icon: Users,
                title: "Peer Endorsements",
                description: "Build trust through cryptographically signed endorsements from your network."
              },
              {
                icon: Award,
                title: "Immutable Credentials",
                description: "Your achievements are permanently recorded on-chain. Tamper-proof and portable."
              },
              {
                icon: FileCheck,
                title: "Smart Contract Verification",
                description: "Automated verification through battle-tested smart contracts on Base."
              },
              {
                icon: Globe,
                title: "Global Recognition",
                description: "Your verified skills are recognized worldwide. No borders, no gatekeepers."
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="group relative p-8 bg-black/40 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-500 hover:border-[#D4AF37] hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 via-[#D4AF37]/0 to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <feature.icon className="stroke-[1.5] text-[#D4AF37] fill-[#D4AF37]/10 w-10 h-10 mb-6" />
                  <h3 className="text-xl font-sans font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-white/60 font-mono text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 relative z-10 bg-black/30" aria-label="How it works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-mono uppercase tracking-wider">
              HOW IT WORKS
            </Badge>
            <h2 className="text-4xl md:text-5xl font-sans font-black text-white mb-4 tracking-tight">
              Three Steps to Verification
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto font-mono">
              Simple. Secure. Sovereign.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Claim",
                description: "Submit your skill claim with supporting evidence. Our AI agents begin verification.",
                icon: FileCheck
              },
              {
                step: "02",
                title: "AI Verification",
                description: "Advanced AI agents test and validate your skills through rigorous challenges.",
                icon: Zap
              },
              {
                step: "03",
                title: "Mint Your Credential",
                description: "Receive your verified credential as an immutable on-chain NFT. Forever yours.",
                icon: Lock
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="group relative p-8 bg-black/40 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-500 hover:border-[#D4AF37] hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              >
                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 via-[#D4AF37]/0 to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="text-6xl font-sans font-black text-primary/20 mb-4">
                    {step.step}
                  </div>
                  <step.icon className="stroke-[1.5] text-[#D4AF37] fill-[#D4AF37]/10 w-10 h-10 mb-6" />
                  <h3 className="text-2xl font-sans font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-white/60 font-mono text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 relative z-10 bg-gradient-to-b from-black/30 to-transparent" aria-label="Platform statistics">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Verified Skills" },
              { value: "5K+", label: "Active Users" },
              { value: "50+", label: "Skill Categories" },
              { value: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <div 
                key={index}
                className="text-center p-8 bg-black/40 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all duration-300"
              >
                <div className="text-5xl font-sans font-black text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-white/60 font-mono uppercase tracking-wider text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative z-10 bg-[#D4AF37] mb-10" aria-label="Call to action">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-black tracking-tighter leading-none mb-6 text-black">
            Ready to Build Your Sovereign Identity?
          </h2>
          <p className="text-xl text-black/70 mb-12 font-mono">
            Join the future of professional verification. No gatekeepers. No intermediaries.
          </p>
          <Button
            className="h-12 px-12 bg-black text-white border border-black font-mono uppercase tracking-wider hover:bg-transparent hover:text-black transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-black/50"
            onClick={() => navigate('/app')}
          >
            GET STARTED NOW
          </Button>
        </div>
      </section>

      <Footer />
      
      {/* Live Ticker at Bottom */}
      <LiveTicker />
    </div>
  );
};
