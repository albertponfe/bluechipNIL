import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Calculator, 
  FileSearch, 
  TrendingUp, 
  BookOpen, 
  User as UserIcon,
  CheckCircle2,
  Instagram,
  Twitter,
  Globe
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-navy text-white font-sans selection:bg-gold selection:text-navy">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-navy/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-navy w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tighter">AthleteBank</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-gold transition-colors">Features</a>
            <a href="#demo" className="hover:text-gold transition-colors">Demos</a>
            <a href="#profiles" className="hover:text-gold transition-colors">Profiles</a>
          </div>
          <button 
            onClick={onLogin}
            className="bg-gold text-navy px-5 py-2 rounded-xl font-bold text-sm hover:bg-gold-light transition-all shadow-lg shadow-gold/10"
          >
            Athlete Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
              THE FINANCIAL <span className="text-gold">OS</span> FOR ATHLETES.
            </h1>
            <p className="text-xl text-neutral-400 mb-10 leading-relaxed max-w-2xl">
              AthleteBank is the first comprehensive wealth management platform built exclusively for the NIL generation. 
              Manage taxes, analyze contracts, and build your legacy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onLogin}
                className="bg-gold text-navy px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gold-light transition-all flex items-center justify-center gap-2 group"
              >
                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#demo"
                className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all text-center"
              >
                View Demos
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Calculator,
                title: "Tax Autopilot",
                desc: "Real-time NIL income tracking and automated quarterly tax estimates."
              },
              {
                icon: FileSearch,
                title: "Contract AI",
                desc: "Instant legal analysis to flag predatory clauses and protect your eligibility."
              },
              {
                icon: TrendingUp,
                title: "NIL Valuation",
                desc: "AI-powered market reports to know exactly what your brand is worth."
              },
              {
                icon: BookOpen,
                title: "Wealth Literacy",
                desc: "Bite-sized financial education modules designed for busy athletes."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-navy border border-white/10 rounded-[2rem] hover:border-gold/50 transition-all group"
              >
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-gold group-hover:text-navy transition-all">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">PLATFORM DEMO</h2>
            <p className="text-neutral-400">See how AthleteBank powers your financial future.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Tax Demo */}
            <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Calculator className="text-gold w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-xs">Tax Autopilot</span>
                </div>
                <span className="text-[10px] font-bold bg-gold/20 text-gold px-2 py-1 rounded">PREVIEW</span>
              </div>
              <div className="space-y-6 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">Estimated Tax</p>
                    <p className="text-2xl font-bold text-gold">$4,250</p>
                  </div>
                  <div className="bg-navy p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">Savings Goal</p>
                    <p className="text-2xl font-bold text-white">85%</p>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gold w-[85%]" />
                </div>
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex justify-between items-center p-3 bg-navy rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/5 rounded-lg" />
                        <div className="w-24 h-3 bg-white/10 rounded" />
                      </div>
                      <div className="w-12 h-3 bg-gold/20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contract Demo */}
            <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <FileSearch className="text-gold w-6 h-6" />
                  <span className="font-bold uppercase tracking-widest text-xs">Contract AI</span>
                </div>
                <span className="text-[10px] font-bold bg-gold/20 text-gold px-2 py-1 rounded">PREVIEW</span>
              </div>
              <div className="space-y-4 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-500">CRITICAL RISK DETECTED</span>
                  </div>
                  <p className="text-sm text-neutral-300">Exclusivity clause conflicts with existing Nike agreement.</p>
                </div>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500">TAX IMPLICATION</span>
                  </div>
                  <p className="text-sm text-neutral-300">Payment structure may trigger self-employment tax.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Promotion */}
      <section id="profiles" className="py-24 px-6 bg-gold text-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-navy/5 -skew-x-12 translate-x-1/4" />
        
        <div className="max-w-7xl mx-auto relative flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tighter mb-8 leading-[0.9]">
              YOUR BRAND, <br />PROFESSIONALIZED.
            </h2>
            <p className="text-navy/70 text-lg mb-10 leading-relaxed">
              AthleteBank profiles are designed to showcase your value to brands. 
              Integrated social metrics, verified deal history, and a professional aesthetic 
              that sets you apart from the competition.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Verified NIL Valuation Badge",
                "Real-time Social Media Metrics",
                "Professional Deal History",
                "Direct Brand Contact Portal"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={onLogin}
              className="bg-navy text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-navy/90 transition-all shadow-xl shadow-navy/20"
            >
              Create Your Profile
            </button>
          </div>

          <div className="flex-1 w-full max-w-md">
            <div className="bg-navy rounded-[3rem] p-8 shadow-2xl relative border border-white/10">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold rounded-full border-8 border-navy flex items-center justify-center shadow-xl shadow-gold/20">
                <TrendingUp className="text-navy w-8 h-8" />
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
                  <UserIcon className="text-neutral-500 w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white tracking-tight">Jordan Smith</h4>
                  <p className="text-gold text-xs font-bold uppercase tracking-[0.2em]">D1 Basketball • Point Guard</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">NIL Value</p>
                  <p className="text-2xl font-bold text-white">$125,400</p>
                  <p className="text-[10px] text-emerald-500 font-bold">+12% this month</p>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Engagement</p>
                  <p className="text-2xl font-bold text-white">8.4%</p>
                  <p className="text-[10px] text-gold font-bold">Top 1% in Sport</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-neutral-500">
                  <span>Social Reach</span>
                  <span className="text-white">450K Total</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gold w-[70%]" />
                  </div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20 w-[30%]" />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Instagram className="w-5 h-5 text-neutral-400" /></div>
                <div className="flex-1 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Twitter className="w-5 h-5 text-neutral-400" /></div>
                <div className="flex-1 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Globe className="w-5 h-5 text-neutral-400" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gold rounded flex items-center justify-center">
              <ShieldCheck className="text-navy w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tighter">AthleteBank</span>
          </div>
          <p className="text-neutral-500 text-sm">© 2024 AthleteBank. All rights reserved.</p>
          <div className="flex gap-6 text-neutral-500 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
