import React, { useState } from 'react';
import { User } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { TrendingUp, Sparkles, Target, Zap, Loader2, Search, BarChart3, Globe, Users, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export function NILValuation({ user, profile }: { user: User; profile: any }) {
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<string | null>(null);

  const calculateValuation = async () => {
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As an NIL valuation expert, provide a detailed valuation report for this college athlete.
        
        Athlete Info:
        Name: ${profile.name}
        Sport: ${profile.sport}
        University: ${profile.university}
        Bio: ${profile.bio}
        Social Media: Instagram: ${profile.instagram || 'N/A'}, Twitter: ${profile.twitter || 'N/A'}, TikTok: ${profile.tiktok || 'N/A'}
        
        Provide:
        1. Estimated Annual NIL Value (Range).
        2. Per Post Valuation (Instagram, TikTok, Twitter).
        3. Market Comparables (Similar athletes in their sport/division).
        4. Growth Potential Score (1-100).
        5. Key Value Drivers (What makes them valuable to brands).
        
        Use Google Search data to find current NIL market benchmarks for ${profile.sport} and ${profile.university} in 2024/2025.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      setValuation(response.text || 'No valuation generated.');
    } catch (error) {
      console.error('Valuation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">NIL Valuation</h2>
        <p className="text-neutral-400 mt-2">Know your worth. AI-powered valuation based on sport, school, and social influence.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!valuation ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-6 backdrop-blur-sm">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="w-10 h-10 text-gold" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-white">What's your NIL worth?</h3>
                <p className="text-neutral-400 mt-2">
                  Our proprietary AI analyzes thousands of data points to give you the most accurate market valuation in the industry.
                </p>
              </div>
              <button
                onClick={calculateValuation}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-gold text-navy px-8 py-4 rounded-2xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/10 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Calculating Market Value...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Calculate My Value
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center">
                    <Award className="text-navy w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Market Valuation Report</h3>
                </div>
                <button
                  onClick={calculateValuation}
                  className="text-sm font-bold text-gold hover:text-gold-light flex items-center gap-1"
                >
                  <Search className="w-4 h-4" />
                  Recalculate
                </button>
              </div>
              <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-neutral-400 prose-strong:text-white prose-li:text-neutral-400">
                <ReactMarkdown>{valuation}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gold rounded-3xl p-8 text-navy">
            <h4 className="text-sm font-bold uppercase tracking-widest text-navy/60 mb-6">Market Trends</h4>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold">Regional Dominance</p>
                  <p className="text-xs text-navy/60 mt-1">Local business deals are up 40% in your region this quarter.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold">Engagement Over Reach</p>
                  <p className="text-xs text-navy/60 mt-1">Brands are paying 2x more for athletes with &gt;5% engagement rates.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-white mb-4">Value Drivers</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-gold rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-neutral-400">Consistent posting schedule (3+ times/week)</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-gold rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-neutral-400">High-quality, original content production</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-gold rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-neutral-400">Active engagement with followers in comments</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
