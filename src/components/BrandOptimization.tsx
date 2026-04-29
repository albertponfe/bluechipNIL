import React, { useState } from 'react';
import { User } from '../firebase';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Sparkles, Target, TrendingUp, Send, Loader2, Award, Zap, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface BrandOptimizationProps {
  user: User;
  profile: any;
}

export function BrandOptimization({ user, profile }: BrandOptimizationProps) {
  const [goalInput, setGoalInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<string | null>(null);

  const handleGenerateStrategy = async () => {
    if (!goalInput.trim()) return;
    setLoading(true);
    setStrategy(null);

    try {
      const prompt = `
        You are an expert NIL (Name, Image, Likeness) brand strategist and social media manager for elite college athletes.
        
        Athlete Profile:
        - Name: ${profile?.name || user.displayName}
        - Sport: ${profile?.sport || 'College Athletics'}
        - University: ${profile?.university || 'University'}
        - Year: ${profile?.year || 'Student-Athlete'}
        - Bio: ${profile?.bio || 'No bio provided.'}
        
        Athlete's Specific Goal/Desire for their Brand:
        "${goalInput}"
        
        Create a highly personalized, actionable "Brand Optimization Route" for this athlete. 
        Format the response using Markdown. Use a professional, empowering, and modern "Financial OS" tone.
        
        Include the following sections:
        1. **Core Strengths to Focus On**: Based on their sport, year, and goals, what are their unique selling propositions (USPs)?
        2. **Where to Execute**: Which platforms (Instagram, TikTok, LinkedIn, local community) make the most sense for this specific goal?
        3. **How to Do It (Action Plan)**: A step-by-step roadmap to increase engagement and image.
        4. **NIL Deal Targeting**: What specific types of brands or local businesses should they pitch to once this strategy is in motion?
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      setStrategy(response.text || 'Could not generate strategy. Please try again.');
    } catch (error) {
      console.error('Error generating strategy:', error);
      setStrategy('An error occurred while generating your brand strategy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Brand Optimization</h2>
          <p className="text-neutral-400 mt-2">Personalized strategies to elevate your NIL value and engagement.</p>
        </div>
        <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
          <Sparkles className="text-gold w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-gold w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Your Brand Vision</h3>
            </div>
            <p className="text-sm text-neutral-400 mb-4">
              Tell us what you want to achieve. Do you want to be a fashion influencer, a local community hero, or build a podcast?
            </p>
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="e.g., I want to build a YouTube channel about my life as a D1 athlete and partner with fitness brands..."
              className="w-full h-32 bg-navy/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-neutral-600 focus:border-gold outline-none resize-none transition-colors mb-4"
            />
            <button
              onClick={handleGenerateStrategy}
              disabled={loading || !goalInput.trim()}
              className="w-full bg-gold text-navy font-bold py-3 px-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Generate Strategy
                </>
              )}
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Why Optimize?</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Higher Valuations</p>
                  <p className="text-xs text-neutral-400">Brands pay more for highly engaged, niche audiences.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Award className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Better Partnerships</p>
                  <p className="text-xs text-neutral-400">Attract brands that align with your actual interests.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Long-term Equity</p>
                  <p className="text-xs text-neutral-400">Build an audience that stays with you after graduation.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-2">
          {strategy ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center">
                  <Sparkles className="text-navy w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Your Personalized Route</h3>
                  <p className="text-xs text-gold uppercase tracking-widest font-bold mt-1">AI-Generated Strategy</p>
                </div>
              </div>
              <div className="prose prose-invert prose-gold max-w-none prose-headings:text-white prose-p:text-neutral-300 prose-li:text-neutral-300 prose-strong:text-white">
                <ReactMarkdown>{strategy}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[400px] bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-navy/50 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <MessageSquare className="text-neutral-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Awaiting Your Input</h3>
              <p className="text-neutral-400 max-w-md">
                Enter your brand goals on the left to generate a personalized, step-by-step optimization route tailored to your profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
