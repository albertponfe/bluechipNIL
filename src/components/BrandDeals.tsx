import React, { useState, useEffect } from 'react';
import { User, db, collection, addDoc, onSnapshot, query, where, OperationType, handleFirestoreError, doc, updateDoc, serverTimestamp } from '../firebase';
import { Briefcase, Plus, Search, Building2, Clock, CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export function BrandDeals({ user, profile }: { user: User; profile: any }) {
  const [deals, setDeals] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: '',
    brandName: '',
    amount: '',
    description: '',
  });
  const [generatingContract, setGeneratingContract] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'deals'), where('athleteId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'deals'));

    return () => unsubscribe();
  }, [user.uid]);

  const handleAddDeal = async () => {
    if (!newDeal.title || !newDeal.brandName) return;
    try {
      await addDoc(collection(db, 'deals'), {
        athleteId: user.uid,
        athleteName: profile.name,
        brandId: 'manual-entry', // For demo purposes, we're manually adding
        brandName: newDeal.brandName,
        title: newDeal.title,
        description: newDeal.description,
        amount: Number(newDeal.amount),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewDeal({ title: '', brandName: '', amount: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deals');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'deals', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${id}`);
    }
  };

  const generateLegalDoc = async (deal: any) => {
    setGeneratingContract(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Generate a formal NIL sponsorship agreement between the athlete ${profile.name} and the brand ${deal.brandName}.
        Deal Title: ${deal.title}
        Description: ${deal.description}
        Amount: $${deal.amount}
        
        Include standard legal clauses for NIL deals, reporting requirements, and term limits. 
        Format it as a professional legal document.`,
      });
      setGeneratedDoc(response.text || 'Error generating document.');
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGeneratingContract(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Brand Deals</h2>
          <p className="text-neutral-400 mt-2">Manage your active sponsorships and generate professional contracts.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gold text-navy px-6 py-3 rounded-2xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/10"
        >
          <Plus className="w-4 h-4" />
          New Deal
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Total Earnings</p>
          <p className="text-3xl font-bold text-white mt-1">
            ${deals.filter(d => d.status === 'completed').reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Active Deals</p>
          <p className="text-3xl font-bold text-white mt-1">
            {deals.filter(d => d.status === 'accepted').length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 shadow-sm">
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Pending Offers</p>
          <p className="text-3xl font-bold text-white mt-1">
            {deals.filter(d => d.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Deals List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Brand & Deal</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No deals found. Add your first deal to get started!</td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{deal.title}</p>
                          <p className="text-xs text-neutral-400">{deal.brandName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">${deal.amount?.toLocaleString() || '0'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        deal.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        deal.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        deal.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-neutral-400'
                      }`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {deal.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateStatus(deal.id, 'accepted')} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleUpdateStatus(deal.id, 'rejected')} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => generateLegalDoc(deal)}
                          className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-gold px-2 py-1 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                        >
                          <FileText className="w-3 h-3" />
                          Legal Doc
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Doc Modal */}
      {generatedDoc && (
        <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-navy">Legal Agreement</h3>
              <button onClick={() => setGeneratedDoc(null)} className="text-neutral-400 hover:text-navy">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 font-serif text-neutral-800 leading-relaxed whitespace-pre-wrap">
              {generatedDoc}
            </div>
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
              <button onClick={() => setGeneratedDoc(null)} className="px-6 py-2 rounded-xl text-sm font-bold text-neutral-500 hover:text-neutral-700">
                Cancel
              </button>
              <button className="px-6 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-all">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 space-y-6">
            <h3 className="text-2xl font-bold text-navy">New NIL Deal</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Deal Title</label>
                <input
                  type="text"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="e.g. Summer Campaign 2024"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Brand Name</label>
                <input
                  type="text"
                  value={newDeal.brandName}
                  onChange={(e) => setNewDeal({ ...newDeal, brandName: e.target.value })}
                  placeholder="e.g. Nike, Local Cafe, etc."
                  className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Amount ($)</label>
                <input
                  type="number"
                  value={newDeal.amount}
                  onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                  rows={3}
                  placeholder="What are the deliverables?"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-gold/20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-neutral-500 hover:bg-neutral-50 transition-all">
                Cancel
              </button>
              <button onClick={handleAddDeal} className="flex-1 bg-gold text-navy px-6 py-4 rounded-2xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/10">
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {generatingContract && (
        <div className="fixed inset-0 bg-navy/80 backdrop-blur-md z-[60] flex items-center justify-center">
          <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <p className="font-bold text-navy">Generating Legal Document...</p>
          </div>
        </div>
      )}
    </div>
  );
}
