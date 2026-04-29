import React, { useState } from 'react';
import { User } from '../firebase';
import { Calculator, Receipt, Landmark, ArrowUpRight, Plus, Loader2, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export function TaxAutopilot({ user, profile }: { user: User; profile: any }) {
  const [incomes, setIncomes] = useState([
    { id: 1, source: 'Nike Deal', amount: 5000, date: '2024-03-15', status: 'Received' },
    { id: 2, source: 'Local Car Dealership', amount: 1200, date: '2024-03-10', status: 'Pending' },
    { id: 3, source: 'Twitch Subs', amount: 450, date: '2024-03-01', status: 'Received' },
  ]);

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const estimatedTax = totalIncome * 0.25; // Simple 25% estimate

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Tax Autopilot</h2>
          <p className="text-neutral-400 mt-2">The financial OS for your NIL earnings. Track, calculate, and save.</p>
        </div>
        <button className="bg-gold text-navy px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gold-light transition-all shadow-lg shadow-gold/10">
          <Plus className="w-5 h-5" />
          Add Income
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center mb-6">
            <DollarSign className="w-6 h-6 text-gold" />
          </div>
          <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider">Total NIL Income</p>
          <h3 className="text-4xl font-bold text-white mt-2">${totalIncome.toLocaleString()}</h3>
          <div className="flex items-center gap-1 text-emerald-400 text-sm mt-4 font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12% from last month</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center mb-6">
            <Calculator className="w-6 h-6 text-gold" />
          </div>
          <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider">Estimated Tax Due</p>
          <h3 className="text-4xl font-bold text-white mt-2">${estimatedTax.toLocaleString()}</h3>
          <p className="text-neutral-500 text-sm mt-4">Next payment due: April 15, 2024</p>
        </div>

        <div className="bg-gold rounded-3xl p-8 text-navy relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-navy/10 rounded-2xl flex items-center justify-center mb-6">
              <Landmark className="w-6 h-6 text-navy" />
            </div>
            <p className="text-navy/60 text-sm font-bold uppercase tracking-wider">Tax Savings Goal</p>
            <h3 className="text-4xl font-bold text-navy mt-2">$2,500</h3>
            <div className="w-full bg-navy/10 h-2 rounded-full mt-6">
              <div className="bg-navy h-full rounded-full w-3/4" />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <Landmark className="w-48 h-48" />
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="p-8 border-b border-white/10 flex justify-between items-center">
          <h4 className="text-xl font-bold text-white">Recent Transactions</h4>
          <button className="text-gold text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-widest border-b border-white/10">
                <th className="px-8 py-4 font-bold">Source</th>
                <th className="px-8 py-4 font-bold">Date</th>
                <th className="px-8 py-4 font-bold">Status</th>
                <th className="px-8 py-4 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incomes.map((income) => (
                <tr key={income.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                        <Receipt className="w-5 h-5 text-gold" />
                      </div>
                      <span className="font-bold text-white">{income.source}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-neutral-400 font-medium">
                    {new Date(income.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      income.status === 'Received' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-gold/10 text-gold'
                    }`}>
                      {income.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-white">
                    ${income.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
