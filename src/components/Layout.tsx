import React from 'react';
import { Tab } from '../App';
import { User, signOut, auth } from '../firebase';
import { FileText, User as UserIcon, Briefcase, TrendingUp, LogOut, ShieldCheck, Calculator, BookOpen, Landmark, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Chatbot } from './Chatbot';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  user: User;
}

export function Layout({ children, activeTab, setActiveTab, user }: LayoutProps) {
  const navItems = [
    { id: 'tax', label: 'Tax Autopilot', icon: Calculator },
    { id: 'contracts', label: 'Contract AI', icon: ShieldCheck },
    { id: 'valuation', label: 'NIL Valuation', icon: TrendingUp },
    { id: 'literacy', label: 'Financial Literacy', icon: BookOpen },
    { id: 'brand', label: 'Brand Optimization', icon: Sparkles },
    { id: 'deals', label: 'Brand Deals', icon: Briefcase },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-navy flex flex-col md:flex-row text-white">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-navy/50 border-r border-white/10 flex flex-col backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shadow-lg shadow-gold/20">
              <Landmark className="text-navy w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">AthleteBank</h1>
              <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-1">Financial OS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-gold text-navy shadow-lg shadow-gold/10'
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-navy' : 'text-neutral-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-gold/20"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-neutral-500 truncate uppercase font-bold tracking-wider">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-sm font-bold text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-navy">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto p-6 md:p-12"
        >
          {children}
        </motion.div>
      </main>

      {/* Chatbot */}
      <Chatbot setActiveTab={setActiveTab} />
    </div>
  );
}
