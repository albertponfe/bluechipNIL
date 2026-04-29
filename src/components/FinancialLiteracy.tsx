import React, { useState, useEffect } from 'react';
import { User } from '../firebase';
import { BookOpen, TrendingUp, CreditCard, PiggyBank, Play, CheckCircle2, Clock, Award, ShieldCheck, ArrowLeft, ArrowRight, AlertCircle, XCircle, FileCheck } from 'lucide-react';
import { motion } from 'motion/react';

const initialModules = [
  {
    id: 1,
    title: 'NIL Budgeting 101',
    description: 'Learn how to manage your first big check and set aside for taxes.',
    icon: PiggyBank,
    duration: '10 min',
    status: 'Not Started',
    progress: 0,
    color: 'emerald',
    achievementTitle: 'The Budgeter',
    achievementDesc: 'Completed Budgeting 101'
  },
  {
    id: 2,
    title: 'Building Credit as an Athlete',
    description: 'How to use your NIL income to build a strong credit score early.',
    icon: CreditCard,
    duration: '15 min',
    status: 'Not Started',
    progress: 0,
    color: 'gold',
    achievementTitle: 'Credit Master',
    achievementDesc: 'Completed Building Credit'
  },
  {
    id: 3,
    title: 'Investing Your NIL Earnings',
    description: 'Introduction to stocks, ETFs, and long-term wealth building.',
    icon: TrendingUp,
    duration: '20 min',
    status: 'Not Started',
    progress: 0,
    color: 'blue',
    achievementTitle: 'The Investor',
    achievementDesc: 'Completed Investing 101'
  },
  {
    id: 4,
    title: 'NIL Tax Compliance',
    description: 'Deep dive into quarterly payments and multi-state tax filing.',
    icon: BookOpen,
    duration: '12 min',
    status: 'Not Started',
    progress: 0,
    color: 'purple',
    achievementTitle: 'Tax Pro',
    achievementDesc: 'Completed Tax Compliance'
  },
  {
    id: 5,
    title: 'NIL Deals: Rules & Limitations',
    description: 'Understand what NIL deals look like, legal characteristics, and NCAA limitations.',
    icon: ShieldCheck,
    duration: '8 min',
    status: 'Not Started',
    progress: 0,
    color: 'navy',
    achievementTitle: 'Compliance Scholar',
    achievementDesc: 'Completed Rules & Limitations'
  },
  {
    id: 6,
    title: 'NIL Deal Compliance Validator',
    description: 'Analyze mock contracts and flag violations before you sign.',
    icon: FileCheck,
    duration: '5 min',
    status: 'Not Started',
    progress: 0,
    color: 'emerald',
    achievementTitle: 'Deal Validator',
    achievementDesc: 'Completed Compliance Validator'
  }
];

const quizQuestions = [
  {
    question: "What is the reporting threshold for third-party NIL deals?",
    options: ["$100", "$600", "$1,000", "No threshold, report everything"],
    correctAnswer: "$600",
    explanation: "The NCAA and most state laws require you to report any third-party NIL agreement or aggregate payments from the same source worth $600 or more."
  },
  {
    question: "How many days do you have to disclose a signed NIL agreement?",
    options: ["3 business days", "5 business days", "10 business days", "By the end of the month"],
    correctAnswer: "5 business days",
    explanation: "You have exactly 5 business days from the day you sign an agreement to disclose it on the official portal."
  },
  {
    question: "Which of the following violates the 'Valid Business Purpose' rule?",
    options: ["Getting paid to post on Instagram", "Getting paid to sign autographs", "Getting paid just for being on the roster", "Getting paid to host a sports camp"],
    correctAnswer: "Getting paid just for being on the roster",
    explanation: "To protect your eligibility, a deal must involve real deliverables. You cannot be paid just for being on the roster or for on-field performance."
  },
  {
    question: "What does 'in perpetuity' mean in a contract?",
    options: ["For one year", "Until you graduate", "Forever", "Only in the United States"],
    correctAnswer: "Forever",
    explanation: "Perpetuity means forever. Never let a brand own your image forever without paying you continuous royalties!"
  },
  {
    question: "Can a booster pay you a bonus specifically for scoring a touchdown?",
    options: ["Yes, if it's over $600", "Yes, if it's reported", "No, this is a pay-for-play violation", "Only if the school approves"],
    correctAnswer: "No, this is a pay-for-play violation",
    explanation: "Compensation cannot be tied to athletic performance or achievement. This is a strict pay-for-play violation."
  },
  {
    question: "What is the official portal for Division I NIL disclosures?",
    options: ["NCAA Connect", "NIL Go", "AthleteBank", "Compliance Hub"],
    correctAnswer: "NIL Go",
    explanation: "All Division I disclosures are handled securely through the College Sports Commission's (CSC) official portal: NIL Go."
  },
  {
    question: "Under the House v. NCAA settlement, what is the approximate first-year cap for direct school revenue sharing?",
    options: ["$5 million", "$10.5 million", "$20.5 million", "$50 million"],
    correctAnswer: "$20.5 million",
    explanation: "The first-year cap for direct school revenue sharing is set around $20.5 million per institution."
  },
  {
    question: "What is an asymmetric termination clause?",
    options: ["When both parties can exit easily", "When one party can exit easily, but the other is locked in", "When the contract terminates automatically", "When the contract cannot be terminated"],
    correctAnswer: "When one party can exit easily, but the other is locked in",
    explanation: "An asymmetric termination clause is unfair. Both sides should have equal rights to exit the agreement."
  },
  {
    question: "Can NIL deals be used as a recruiting inducement to get you to transfer?",
    options: ["Yes, if the collective offers it", "No, this is strictly prohibited", "Only if you are in the transfer portal", "Yes, if the coach approves"],
    correctAnswer: "No, this is strictly prohibited",
    explanation: "NIL deals cannot be used as an incentive for a recruit to attend a specific university or for a current athlete to remain at or transfer to a specific university."
  },
  {
    question: "Are you allowed to hire an agent for NIL activities?",
    options: ["Yes, for all activities including pro contracts", "Yes, but not for future pro sports contracts", "No, agents violate amateurism", "Only after you graduate"],
    correctAnswer: "Yes, but not for future pro sports contracts",
    explanation: "Athletes are allowed to use professional service providers (like agents or tax advisors) for NIL activities, but not for future professional athletic contract negotiations."
  }
];

export function FinancialLiteracy({ user, profile }: { user: User; profile: any }) {
  const [modules, setModules] = useState(initialModules);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  
  // New Stepped Flow State
  const [nilStep, setNilStep] = useState(0); 
  // 0: Intro, 1: Compliance, 2: Valid Purpose, 3: Contracts, 4: Quiz Intro, 5: Quiz Active, 6: Quiz Results

  // Simulator State
  const [simulatorPayerName, setSimulatorPayerName] = useState('');
  const [simulatorValue, setSimulatorValue] = useState('');
  const [simulatorDeliverables, setSimulatorDeliverables] = useState(false);
  const [simulatorNoDeliverables, setSimulatorNoDeliverables] = useState(false);

  // Swipe Game State
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeFeedback, setSwipeFeedback] = useState<{status: 'success' | 'error', message: string} | null>(null);
  
  // Quiz State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);

  // Validator Module State
  const [validatorStep, setValidatorStep] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [validatorFeedback, setValidatorFeedback] = useState<{isCorrect: boolean, message: string} | null>(null);

  const validatorScenarios = [
    {
      details: "A local boutique offers you a $400 cash payment to post three Instagram stories reviewing their products.",
      correctAction: 'approve',
      feedback: "Correct! This deal has a clear business purpose with real deliverables. Since it's under $600, you aren't even required to report it to NIL Go, though recording it for taxes is always smart."
    },
    {
      details: "A luxury student apartment complex offers you a free apartment lease worth $15,000. However, the contract states the lease cancels immediately if you enter the NCAA Transfer Portal.",
      correctAction: 'flag',
      feedback: "Correct! This is an illegal retention inducement. Third-party deals cannot be used to lock you into a school or dictate your transfer decisions."
    },
    {
      details: "An athletic footwear brand agrees to pay you a $10,000 cash bonus if you are named Conference Player of the Week or make the All-American team.",
      correctAction: 'flag',
      feedback: "Correct! This is a performance bonus. NIL deals cannot be tied to on-field success or stats. Compensation must be for marketing deliverables."
    },
    {
      details: "A local sports drink company agrees to pay you $5,000 for a 2-hour autograph appearance at their flagship store.",
      correctAction: 'approve',
      feedback: "Correct! This has a valid business purpose and active deliverables. Because it is over the $600 threshold, you have exactly 5 business days to disclose this deal on the NIL Go platform!"
    }
  ];

  const handleValidatorAction = (action: 'approve' | 'flag') => {
    const scenario = validatorScenarios[currentScenario];
    if (action === scenario.correctAction) {
      setValidatorFeedback({ isCorrect: true, message: scenario.feedback });
    } else {
      setValidatorFeedback({ isCorrect: false, message: "Incorrect. Review the compliance rules and try again." });
    }
  };

  const nextValidatorScenario = () => {
    setValidatorFeedback(null);
    if (currentScenario < validatorScenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
    } else {
      setValidatorStep(2); // Completed
    }
  };

  useEffect(() => {
    setModules(prev => prev.map(m => {
      if (m.id === 5) {
        if (m.status === 'Completed') return m;
        let newProgress = Math.round((nilStep / 6) * 100);
        let newStatus = newProgress === 0 ? 'Not Started' : 'In Progress';
        if (nilStep === 6 && score >= 8) {
          newProgress = 100;
          newStatus = 'Completed';
        } else if (nilStep === 6) {
          newProgress = 99;
        }
        return { ...m, progress: newProgress, status: newStatus };
      }
      if (m.id === 6) {
        if (m.status === 'Completed') return m;
        let newProgress = Math.round((validatorStep / 2) * 100);
        let newStatus = newProgress === 0 ? 'Not Started' : newProgress === 100 ? 'Completed' : 'In Progress';
        return { ...m, progress: newProgress, status: newStatus };
      }
      return m;
    }));
  }, [nilStep, score, validatorStep]);

  const swipeScenarios = [
    {
      text: "A booster collective offers you $5,000 upfront. When you ask what you need to do, they say 'Just win the conference championship.'",
      correctAction: 'reject',
      successMessage: "Correct! This is a performance bonus and pay-for-play scheme. Huge eligibility risk."
    },
    {
      text: "A local gym offers you a free $200 monthly membership if you post one story a month working out there.",
      correctAction: 'accept',
      successMessage: "Correct! This has a clear business purpose and active deliverables. Since it's under $600, you don't even have to report it to NIL Go."
    }
  ];

  const handleSwipe = (action: 'accept' | 'reject') => {
    if (swipeIndex >= swipeScenarios.length) return;
    
    const scenario = swipeScenarios[swipeIndex];
    if (action === scenario.correctAction) {
      setSwipeFeedback({ status: 'success', message: scenario.successMessage });
    } else {
      setSwipeFeedback({ status: 'error', message: "Incorrect. Review the rules above." });
    }
    
    setTimeout(() => {
      setSwipeIndex(prev => prev + 1);
      setSwipeFeedback(null);
    }, 3000);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;
    setIsAnswerChecked(true);
    if (selectedOption === quizQuestions[currentQIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < quizQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setNilStep(6); // Go to results
    }
  };

  const resetQuiz = () => {
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScore(0);
    setNilStep(5);
  };

  if (activeModuleId === 6) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <button 
          onClick={() => { setActiveModuleId(null); setValidatorStep(0); setCurrentScenario(0); setValidatorFeedback(null); }}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Modules
        </button>

        <div className="bg-[#0A1128] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          
          {/* STEP 0: INITIAL LEARNING MATERIALS */}
          {validatorStep === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <header>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">COMPLIANCE 101</p>
                <h2 className="text-4xl font-bold text-white tracking-tighter leading-[0.9] mb-8">The Rules of the Game</h2>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-xl font-bold text-white mb-3">Direct Activation Required</h4>
                  <p className="text-neutral-400 leading-relaxed">
                    You cannot receive money just for being on the roster. Every deal requires a Valid Business Purpose with real deliverables (e.g., a photo, post, camp, or appearance).
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-xl font-bold text-white mb-3">No Performance Bonuses</h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Contracts cannot pay you more for winning awards, scoring points, or getting selected to specific teams.
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-xl font-bold text-white mb-3">No Inducements</h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Money or perks cannot be promised to keep you from transferring or to recruit you to a school.
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                  <h4 className="text-xl font-bold text-white mb-3">The $600 / 5-Day Rule</h4>
                  <p className="text-neutral-400 leading-relaxed">
                    Any third-party deal worth $600 or more must be reported to the College Sports Commission (CSC) via the NIL Go platform within 5 business days of signing.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-white/10">
                <button 
                  onClick={() => setValidatorStep(1)}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                  Start Validator <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: INTERACTIVE VALIDATOR */}
          {validatorStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <header className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">DEAL COMPLIANCE VALIDATOR</p>
                  <h2 className="text-3xl font-bold text-white tracking-tighter leading-[0.9]">Review Contract #{currentScenario + 1}</h2>
                </div>
                <div className="text-neutral-400 text-sm font-bold">
                  {currentScenario + 1} / {validatorScenarios.length}
                </div>
              </header>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-b-full"></div>
                
                <h3 className="text-xl font-bold text-white mb-6">Contract Details:</h3>
                <p className="text-lg text-neutral-300 leading-relaxed mb-12 font-serif italic">
                  "{validatorScenarios[currentScenario].details}"
                </p>

                {!validatorFeedback ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => handleValidatorAction('flag')}
                      className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-bold hover:bg-red-500/20 transition-colors text-lg"
                    >
                      FLAG VIOLATION
                    </button>
                    <button 
                      onClick={() => handleValidatorAction('approve')}
                      className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-4 rounded-2xl font-bold hover:bg-emerald-500/20 transition-colors text-lg"
                    >
                      APPROVE DEAL
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-2xl border ${
                      validatorFeedback.isCorrect 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {validatorFeedback.isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                      )}
                      <div>
                        <h4 className={`text-lg font-bold mb-2 ${validatorFeedback.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                          {validatorFeedback.isCorrect ? 'Correct Decision' : 'Incorrect Decision'}
                        </h4>
                        <p className={validatorFeedback.isCorrect ? 'text-emerald-400/90' : 'text-red-400/90'}>
                          {validatorFeedback.message}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                      <button 
                        onClick={nextValidatorScenario}
                        className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        {currentScenario < validatorScenarios.length - 1 ? 'Next Contract' : 'Finish Validator'} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: COMPLETED */}
          {validatorStep === 2 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-4xl font-bold text-white tracking-tight mb-4">Validator Complete</h3>
              <p className="text-neutral-400 text-lg mb-12 max-w-lg mx-auto">
                You've successfully reviewed all mock contracts. You're now better prepared to spot compliance red flags in the real world.
              </p>
              <button 
                onClick={() => { setActiveModuleId(null); setValidatorStep(0); setCurrentScenario(0); setValidatorFeedback(null); }}
                className="bg-[#D4AF37] text-[#0A1128] px-12 py-5 rounded-2xl font-bold text-lg hover:bg-white transition-colors"
              >
                Return to Modules
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (activeModuleId === 5) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <button 
          onClick={() => { setActiveModuleId(null); setNilStep(0); }}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Modules
        </button>

        <div className="bg-[#0A1128] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          
          {/* Progress Bar for Steps 0-4 */}
          {nilStep < 5 && (
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <div 
                className="h-full bg-[#D4AF37] transition-all duration-500"
                style={{ width: `${(nilStep / 4) * 100}%` }}
              />
            </div>
          )}

          {/* STEP 0: INTRO */}
          {nilStep === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <div className="relative h-64 rounded-3xl overflow-hidden border border-white/10">
                <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80" alt="Athlete in stadium" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] to-transparent"></div>
                <div className="absolute bottom-8 left-8">
                  <div className="w-16 h-16 bg-[#D4AF37]/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-[#D4AF37]/30">
                    <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tighter leading-[0.9]">NIL Basics & Limitations</h2>
                </div>
              </div>

              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">CONCEPT 1</p>
                <h3 className="text-3xl font-bold text-white tracking-tight mb-6">Welcome to the Professional Era</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                    <h4 className="text-xl font-bold text-white mb-3">Pillar 1: Direct School Revenue Sharing</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      Under the landmark House v. NCAA settlement, Division I schools that opt-in can directly share a capped pool of athletic revenue with you. This first-year cap is set around <span className="text-white font-bold">$20.5 million</span> per institution.
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl">
                    <h4 className="text-xl font-bold text-white mb-3">Pillar 2: Third-Party NIL Deals</h4>
                    <p className="text-neutral-400 leading-relaxed">
                      This is your standard brand partnership. You are monetizing your personal brand (Name, Image, and Likeness) with outside companies, local businesses, and booster collectives.
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-8 border-t border-white/10">
                <button 
                  onClick={() => setNilStep(1)}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                  Next: Compliance Rules <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: COMPLIANCE & SIMULATOR */}
          {nilStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">CONCEPT 2</p>
                <h3 className="text-3xl font-bold text-white tracking-tight mb-6">The Out-Of-Bounds Lines</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                    <h4 className="text-3xl font-bold text-white mb-2">$600</h4>
                    <p className="text-neutral-400 text-sm">You must report any third-party NIL agreement worth $600 or more.</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                    <h4 className="text-3xl font-bold text-white mb-2">5 Days</h4>
                    <p className="text-neutral-400 text-sm">You have exactly 5 business days from signing to disclose it.</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
                    <h4 className="text-xl font-bold text-white mb-2 mt-2">NIL Go</h4>
                    <p className="text-neutral-400 text-sm">The official secure portal for all Division I disclosures.</p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Activity: The NIL Deal Simulator</h3>
                  <p className="text-neutral-400 text-sm mb-6">Enter a mock deal to see the compliance rules in action.</p>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Payer Name</label>
                        <input 
                          type="text" 
                          value={simulatorPayerName}
                          onChange={(e) => setSimulatorPayerName(e.target.value)}
                          className="w-full bg-[#0A1128] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                          placeholder="e.g., Local Dealership"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Deal Value ($)</label>
                        <input 
                          type="number" 
                          value={simulatorValue}
                          onChange={(e) => setSimulatorValue(e.target.value)}
                          className="w-full bg-[#0A1128] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    {parseInt(simulatorValue) >= 600 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-4 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <p className="text-[#D4AF37] text-sm font-medium">REMINDER: Because this deal is $600 or more, it must be disclosed on the NIL Go platform within 5 business days of signing.</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex justify-between pt-8 border-t border-white/10">
                <button onClick={() => setNilStep(0)} className="text-neutral-400 hover:text-white font-bold px-6 py-4">Back</button>
                <button 
                  onClick={() => setNilStep(2)}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                  Next: Valid Business Purpose <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: VALID BUSINESS PURPOSE & SWIPE GAME */}
          {nilStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">CONCEPT 3</p>
                <h3 className="text-3xl font-bold text-white tracking-tight mb-6">Valid Business Purpose</h3>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl mb-12">
                  <p className="text-neutral-300 leading-relaxed mb-6">
                    To protect your eligibility, a deal must involve <span className="text-white font-bold">real deliverables</span> (social posts, appearances, camps). You cannot be paid just for being on the roster or for on-field performance (Pay-for-Play).
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                      <CheckCircle2 className="w-4 h-4" /> Allowed: Paid to post on TikTok
                    </div>
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
                      <XCircle className="w-4 h-4" /> Banned: Paid $500 per touchdown
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A1128] border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                  <h3 className="text-xl font-bold text-white tracking-tight mb-8 absolute top-8">Activity: Swipe Right or Left</h3>
                  
                  {swipeIndex < swipeScenarios.length ? (
                    <motion.div 
                      key={swipeIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative z-10 mt-12"
                    >
                      <p className="text-white text-lg leading-relaxed mb-8">{swipeScenarios[swipeIndex].text}</p>
                      <div className="flex justify-center gap-4">
                        <button 
                          onClick={() => handleSwipe('reject')}
                          className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-2xl font-bold hover:bg-red-500/20 transition-colors"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleSwipe('accept')}
                          className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-3 rounded-2xl font-bold hover:bg-emerald-500/20 transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center z-10 mt-12">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-2">Training Complete</h4>
                      <p className="text-neutral-400">You've mastered the basics of NIL compliance.</p>
                      <button 
                        onClick={() => setSwipeIndex(0)}
                        className="mt-6 text-[#D4AF37] text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Play Again
                      </button>
                    </div>
                  )}

                  {swipeFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md p-4 rounded-2xl text-center font-medium z-20 ${
                        swipeFeedback.status === 'success' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}
                    >
                      {swipeFeedback.message}
                    </motion.div>
                  )}
                </div>
              </section>

              <div className="flex justify-between pt-8 border-t border-white/10">
                <button onClick={() => setNilStep(1)} className="text-neutral-400 hover:text-white font-bold px-6 py-4">Back</button>
                <button 
                  onClick={() => setNilStep(3)}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                  Next: Contract Traps <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONTRACTS & HIGHLIGHTER */}
          {nilStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <div className="relative h-48 rounded-3xl overflow-hidden border border-white/10 mb-8">
                <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80" alt="Contract signing" className="w-full h-full object-cover opacity-40 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] to-transparent"></div>
                <div className="absolute bottom-6 left-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1">CONCEPT 4</p>
                  <h3 className="text-3xl font-bold text-white tracking-tight">Contract Traps</h3>
                </div>
              </div>

              <section>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">Activity: "Red Flag" Highlighter</h3>
                  <p className="text-neutral-400 mb-8 text-sm">Hover over the highlighted text in this mock contract to reveal hidden legal traps.</p>
                  
                  <div className="bg-[#0A1128]/80 border border-white/5 p-8 rounded-3xl font-serif text-neutral-300 leading-loose space-y-6 text-lg">
                    <p>
                      This Name, Image, and Likeness Agreement is entered into by and between the Athlete and Brand X. 
                      <span className="relative group inline-block mx-1">
                        <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded cursor-help border-b border-red-500/50 transition-colors group-hover:bg-red-500/40">
                          The Athlete grants Brand X the exclusive, irrevocable right to use their NIL worldwide in perpetuity.
                        </span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#0A1128] border border-red-500/50 text-red-400 text-sm p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-10 font-sans leading-snug">
                          <strong className="block text-white mb-1">🚩 Perpetuity Trap</strong>
                          Perpetuity means FOREVER. Never let a brand own your image forever without paying you continuous royalties!
                        </span>
                      </span>
                      The Athlete agrees to participate in all promotional activities as directed by the Brand.
                    </p>
                    <p>
                      Furthermore, regarding the termination of this agreement: 
                      <span className="relative group inline-block mx-1">
                        <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded cursor-help border-b border-red-500/50 transition-colors group-hover:bg-red-500/40">
                          The Agent may terminate this agreement at any time with 10 days' notice, while the Athlete is bound for the full 3-year term.
                        </span>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-[#0A1128] border border-red-500/50 text-red-400 text-sm p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-10 font-sans leading-snug">
                          <strong className="block text-white mb-1">🚩 Asymmetric Termination</strong>
                          This is completely unfair to you as the athlete. Both sides should have equal rights to exit the contract.
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              <div className="flex justify-between pt-8 border-t border-white/10">
                <button onClick={() => setNilStep(2)} className="text-neutral-400 hover:text-white font-bold px-6 py-4">Back</button>
                <button 
                  onClick={() => setNilStep(4)}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors flex items-center gap-2"
                >
                  Test My Learning <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: QUIZ INTRO */}
          {nilStep === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
              <div className="w-24 h-24 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#D4AF37]/20">
                <ShieldCheck className="w-12 h-12 text-[#D4AF37]" />
              </div>
              <h3 className="text-4xl font-bold text-white tracking-tight mb-4">Ready to test your knowledge?</h3>
              <p className="text-neutral-400 text-lg mb-12 max-w-lg mx-auto">
                You will face 10 questions covering everything you just learned. You need an 80% or higher to pass this module.
              </p>
              <button 
                onClick={() => {
                  setCurrentQIndex(0);
                  setSelectedOption(null);
                  setIsAnswerChecked(false);
                  setScore(0);
                  setNilStep(5);
                }}
                className="bg-[#D4AF37] text-[#0A1128] px-12 py-5 rounded-2xl font-bold text-lg hover:bg-white transition-colors shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
              >
                Start Quiz
              </button>
            </motion.div>
          )}

          {/* STEP 5: QUIZ ACTIVE */}
          {nilStep === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex justify-between items-center mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Question {currentQIndex + 1} of 10</p>
                <div className="flex gap-1">
                  {quizQuestions.map((_, idx) => (
                    <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentQIndex ? 'bg-[#D4AF37]' : idx < currentQIndex ? 'bg-white/20' : 'bg-white/5'}`} />
                  ))}
                </div>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-8">
                {quizQuestions[currentQIndex].question}
              </h3>

              <div className="space-y-4">
                {quizQuestions[currentQIndex].options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === quizQuestions[currentQIndex].correctAnswer;
                  
                  let buttonClass = "w-full text-left p-6 rounded-2xl border transition-all duration-200 ";
                  
                  if (!isAnswerChecked) {
                    buttonClass += isSelected 
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-white" 
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20";
                  } else {
                    if (isCorrect) {
                      buttonClass += "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-red-500/20 border-red-500/50 text-red-300";
                    } else {
                      buttonClass += "bg-white/5 border-white/10 text-neutral-500 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !isAnswerChecked && setSelectedOption(option)}
                      disabled={isAnswerChecked}
                      className={buttonClass}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-lg">{option}</span>
                        {isAnswerChecked && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                        {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isAnswerChecked && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-2xl mt-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-2">EXPLANATION</p>
                  <p className="text-neutral-300 leading-relaxed">{quizQuestions[currentQIndex].explanation}</p>
                </motion.div>
              )}

              <div className="flex justify-end pt-8 mt-8 border-t border-white/10">
                {!isAnswerChecked ? (
                  <button 
                    onClick={handleCheckAnswer}
                    disabled={!selectedOption}
                    className="bg-[#D4AF37] text-[#0A1128] px-10 py-4 rounded-2xl font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button 
                    onClick={handleNextQuestion}
                    className="bg-white text-[#0A1128] px-10 py-4 rounded-2xl font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                  >
                    {currentQIndex < quizQuestions.length - 1 ? 'Next Question' : 'See Results'} <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 6: QUIZ RESULTS */}
          {nilStep === 6 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="mb-8 relative inline-block">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                  <circle 
                    cx="96" cy="96" r="88" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - score / 10)}
                    className={score >= 8 ? "text-emerald-500 transition-all duration-1000 ease-out" : "text-red-500 transition-all duration-1000 ease-out"} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-white">{score * 10}%</span>
                </div>
              </div>

              {score >= 8 ? (
                <>
                  <h3 className="text-3xl font-bold text-emerald-400 mb-4">Module Passed!</h3>
                  <p className="text-neutral-400 mb-12 max-w-md mx-auto">Excellent work. You have a solid understanding of NIL rules, compliance, and contract traps.</p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-red-400 mb-4">Keep Learning</h3>
                  <p className="text-neutral-400 mb-12 max-w-md mx-auto">You need an 80% to pass. Review the concepts and try again to secure your knowledge.</p>
                </>
              )}

              <div className="flex justify-center gap-4">
                <button 
                  onClick={resetQuiz}
                  className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-colors"
                >
                  Re-take Quiz
                </button>
                <button 
                  onClick={() => { setActiveModuleId(null); setNilStep(0); }}
                  className="bg-[#D4AF37] text-[#0A1128] px-8 py-4 rounded-2xl font-bold hover:bg-white transition-colors"
                >
                  Go to Menu
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Financial Literacy</h2>
        <p className="text-neutral-400 mt-2">Bite-sized modules built for 18-22 year old athletes, not accountants.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => {
              const isCompleted = module.status === 'Completed';
              return (
              <motion.div
                key={module.id}
                whileHover={{ y: -4 }}
                onClick={() => (module.id === 5 || module.id === 6) && setActiveModuleId(module.id)}
                className={`${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'} border rounded-3xl p-8 backdrop-blur-sm group cursor-pointer transition-colors`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'} rounded-2xl flex items-center justify-center group-hover:${isCompleted ? 'bg-emerald-500/30' : 'bg-[#D4AF37]/20'} transition-colors`}>
                    <module.icon className="w-6 h-6" />
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <div className="flex items-center gap-1 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      {module.duration}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{module.title}</h3>
                <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{module.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-neutral-500">Progress</span>
                    <span className={isCompleted ? "text-emerald-400" : "text-white"}>{module.progress}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`${isCompleted ? 'bg-emerald-400' : 'bg-[#D4AF37]'} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                </div>
                
                <button className={`w-full mt-6 py-3 rounded-xl ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10'} font-bold text-sm transition-colors flex items-center justify-center gap-2`}>
                  <Play className="w-4 h-4 fill-current" />
                  {module.status === 'In Progress' ? 'Continue' : isCompleted ? 'Review' : 'Start Module'}
                </button>
              </motion.div>
            )})}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#D4AF37] rounded-3xl p-8 text-[#0A1128]">
            <div className="flex items-center gap-3 mb-6">
              <Award className="w-8 h-8" />
              <h4 className="text-xl font-bold">Your Achievements</h4>
            </div>
            <div className="space-y-4">
              {modules.filter(m => m.status === 'Completed').length > 0 ? (
                modules.filter(m => m.status === 'Completed').map((module, idx) => (
                  <div key={module.id} className="bg-[#0A1128]/5 rounded-2xl p-4 flex items-center gap-4 border border-[#0A1128]/10">
                    <div className="w-10 h-10 bg-[#0A1128]/10 rounded-xl flex items-center justify-center font-bold">{idx + 1}</div>
                    <div>
                      <p className="text-sm font-bold">{module.achievementTitle}</p>
                      <p className="text-xs text-[#0A1128]/60">{module.achievementDesc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#0A1128]/5 rounded-2xl p-4 flex items-center gap-4 border border-[#0A1128]/10 opacity-60">
                  <div className="w-10 h-10 bg-[#0A1128]/10 rounded-xl flex items-center justify-center font-bold">-</div>
                  <div>
                    <p className="text-sm font-bold">No Achievements Yet</p>
                    <p className="text-xs text-[#0A1128]/60">Complete modules to earn badges.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-white mb-4">Why it matters</h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              The average athlete is 19 years old with no financial education running what is effectively a small business. We're here to help you keep what you earn.
            </p>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-gold font-bold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>5.3x more earnings with pro support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
