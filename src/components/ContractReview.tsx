import React, { useState, useEffect, useRef } from 'react';
import { 
  User, db, collection, addDoc, onSnapshot, query, where, 
  OperationType, handleFirestoreError, deleteDoc, doc,
  storage, ref, uploadBytes, getDownloadURL, deleteObject, serverTimestamp
} from '../firebase';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { FileText, Upload, AlertTriangle, CheckCircle, Trash2, Loader2, Search, FileUp, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export function ContractReview({ user }: { user: User }) {
  const [fileContent, setFileContent] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'analyses'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnalyses(data.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'analyses'));

    return () => unsubscribe();
  }, [user.uid]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!fileContent.trim() && !selectedFile) return;
    setAnalyzing(true);
    try {
      let analysisText = '';
      let fileUrl = '';
      let fileName = 'Text Analysis ' + new Date().toLocaleDateString();

      if (selectedFile) {
        fileName = selectedFile.name;
        // 1. Upload to Firebase Storage
        const storageRef = ref(storage, `contracts/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(uploadResult.ref);

        // 2. Prepare for Gemini (Multimodal)
        const base64Data = await fileToBase64(selectedFile);
        const filePart = {
          inlineData: {
            data: base64Data,
            mimeType: selectedFile.type || 'application/pdf'
          }
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: {
            parts: [
              filePart,
              { text: `Analyze this NIL (Name, Image, Likeness) contract for a college athlete. 
              Identify potential risks, eligibility issues (NCAA), tax implications, and any predatory clauses.
              Provide a summary, a list of flagged risks, and recommendations.
              Use a professional, financial OS tone.` }
            ]
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });
        analysisText = response.text || 'No analysis generated.';
      } else {
        // Text-only analysis
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `Analyze this NIL (Name, Image, Likeness) contract for a college athlete. 
          Identify potential risks, eligibility issues (NCAA), tax implications, and any predatory clauses.
          Provide a summary, a list of flagged risks, and recommendations.
          Use a professional, financial OS tone.
          
          Contract Content:
          ${fileContent}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });
        analysisText = response.text || 'No analysis generated.';
      }

      // Save to Firestore
      await addDoc(collection(db, 'analyses'), {
        athleteId: user.uid,
        fileName,
        fileUrl,
        analysis: analysisText,
        risks: [],
        createdAt: serverTimestamp()
      });

      setFileContent('');
      setSelectedFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'analyses');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (analysis: any) => {
    try {
      // Delete from Storage if exists
      if (analysis.fileUrl) {
        try {
          const storageRef = ref(storage, analysis.fileUrl);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn('Could not delete file from storage:', e);
        }
      }
      await deleteDoc(doc(db, 'analyses', analysis.id));
      if (selectedAnalysis?.id === analysis.id) setSelectedAnalysis(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `analyses/${analysis.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Contract AI</h2>
        <p className="text-neutral-400 mt-2">Flags predatory clauses in plain English before you sign. Compares deal terms to market benchmarks.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-gold" />
                Contract Input
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-gold hover:text-gold-light flex items-center gap-1 px-3 py-1.5 bg-gold/10 rounded-lg transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Upload PDF/DOCX
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.docx,.doc"
                />
              </div>
            </div>

            {selectedFile ? (
              <div className="mb-6 p-6 border-2 border-dashed border-gold/20 bg-gold/5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-neutral-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="Paste the contract text here or upload a file..."
                className="w-full h-64 p-4 rounded-2xl bg-white/5 border-none focus:ring-2 focus:ring-gold/20 transition-all resize-none text-white leading-relaxed placeholder:text-neutral-600"
              />
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!fileContent.trim() && !selectedFile)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-gold text-navy px-6 py-4 rounded-2xl font-bold hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold/10"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Contract
                </>
              )}
            </button>
          </div>

          {selectedAnalysis && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAnalysis.fileName}</h3>
                  {selectedAnalysis.fileUrl && (
                    <a 
                      href={selectedAnalysis.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-gold hover:underline flex items-center gap-1 mt-1"
                    >
                      <FileText className="w-3 h-3" />
                      View Original Document
                    </a>
                  )}
                </div>
                <button onClick={() => setSelectedAnalysis(null)} className="text-neutral-500 hover:text-white transition-colors font-bold text-sm">
                  Close
                </button>
              </div>
              <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-neutral-400 prose-strong:text-white prose-li:text-neutral-400">
                <ReactMarkdown>{selectedAnalysis.analysis}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4">Recent Analyses</h3>
            <div className="space-y-3">
              {analyses.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-8">No analyses yet.</p>
              ) : (
                analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    onClick={() => setSelectedAnalysis(analysis)}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedAnalysis?.id === analysis.id
                        ? 'border-gold/50 bg-gold/10'
                        : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{analysis.fileName}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {analysis.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(analysis);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gold rounded-3xl p-6 text-navy overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-navy/60" />
                <span className="text-xs font-bold uppercase tracking-wider text-navy/60">Pro Tip</span>
              </div>
              <p className="text-sm text-navy font-medium leading-relaxed">
                Always check for "Exclusivity" clauses. They can prevent you from signing other deals in the same category.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-navy/10 rounded-full blur-2xl opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
