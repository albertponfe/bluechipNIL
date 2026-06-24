import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Sparkles,
  Users,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Instagram,
  Star,
  Zap,
  ArrowRight,
  BarChart3,
  Shield,
} from 'lucide-react';

// ── Mini demo components ──────────────────────────────────────────────────────

function AthleteCard({ name, sport, school, followers, score }: {
  name: string; sport: string; school: string; followers: string; score: number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/4 hover:bg-white/7 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/40 to-blue-700/40 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#f0f0f5] truncate">{name}</p>
        <p className="text-xs text-[#9494a5] truncate">{sport} · {school}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-[#3d8bff]">{followers}</p>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <Star className="w-2.5 h-2.5 text-[#00f292]" />
          <span className="text-xs text-[#00f292] font-semibold">{score}%</span>
        </div>
      </div>
    </div>
  );
}

function DemoDiscovery() {
  const athletes = [
    { name: 'Marcus J.', sport: 'Football', school: 'USC', followers: '84K', score: 97 },
    { name: 'Aisha T.', sport: 'Track', school: 'Oregon', followers: '52K', score: 94 },
    { name: 'Devon C.', sport: 'Basketball', school: 'Duke', followers: '130K', score: 91 },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-7 rounded-lg bg-white/6 border border-white/8 px-3 flex items-center">
          <span className="text-xs text-[#9494a5]">Search athletes by sport, school, followers…</span>
        </div>
        <div className="h-7 px-3 rounded-lg bg-[#3d8bff]/20 border border-[#3d8bff]/30 flex items-center">
          <span className="text-xs text-[#3d8bff] font-medium">Filter</span>
        </div>
      </div>
      {athletes.map((a) => (
        <AthleteCard key={a.name} {...a} />
      ))}
    </div>
  );
}

function DemoCampaign() {
  const lines = [
    { label: 'Brand', value: 'GreenFlow Hydration' },
    { label: 'Goal', value: 'Increase college-market awareness' },
    { label: 'Athlete', value: 'Marcus J. — 84K followers' },
  ];
  const output = [
    '✦ 3 sponsored reel concepts',
    '✦ Suggested caption & hashtags',
    '✦ Estimated reach: 210K–340K',
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center gap-2 text-xs">
            <span className="text-[#9494a5] w-14 shrink-0">{l.label}</span>
            <span className="flex-1 h-6 rounded-md bg-white/6 border border-white/8 px-2 flex items-center text-[#f0f0f5]">{l.value}</span>
          </div>
        ))}
      </div>
      <div className="h-px bg-white/8" />
      <div className="rounded-xl border border-[#3d8bff]/25 bg-[#3d8bff]/5 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#3d8bff]" />
          <span className="text-xs font-semibold text-[#3d8bff]">AI Campaign Ready</span>
        </div>
        {output.map((o) => (
          <p key={o} className="text-xs text-[#f0f0f5]/80">{o}</p>
        ))}
      </div>
    </div>
  );
}

function DemoContract() {
  const clauses = [
    { label: 'Deal value', value: '$2,500', ok: true },
    { label: 'Deliverables', value: '2 reels · 3 stories', ok: true },
    { label: 'Exclusivity', value: '90 days — category', ok: false },
    { label: 'Usage rights', value: 'Paid ads allowed', ok: true },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <FileCheck className="w-4 h-4 text-[#00f292]" />
        <span className="text-xs font-semibold text-[#f0f0f5]">Contract Review</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">Review needed</span>
      </div>
      {clauses.map((c) => (
        <div key={c.label} className="flex items-center gap-2 text-xs">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.ok ? 'bg-[#00f292]' : 'bg-yellow-400'}`} />
          <span className="text-[#9494a5] w-20 shrink-0">{c.label}</span>
          <span className="text-[#f0f0f5]">{c.value}</span>
          {!c.ok && <span className="ml-auto text-yellow-400 text-[10px]">⚠ Review</span>}
        </div>
      ))}
      <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/8 border border-yellow-500/20 text-xs text-yellow-300">
        AI flagged 1 clause. Tap to see suggested edits.
      </div>
    </div>
  );
}

function DemoInsights() {
  const bars = [65, 82, 54, 90, 75, 88, 70];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#9494a5]">Est. campaign reach</p>
          <p className="text-xl font-bold text-[#f0f0f5]">284K <span className="text-sm font-normal text-[#00f292]">+12%</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9494a5]">Eng. rate</p>
          <p className="text-lg font-bold text-[#3d8bff]">6.4%</p>
        </div>
      </div>
      <div className="flex items-end gap-1 h-16">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${h}%`,
                background: i === 5 ? '#3d8bff' : 'rgba(61,139,255,0.25)',
              }}
            />
            <span className="text-[9px] text-[#9494a5]">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Impressions', val: '1.2M' },
          { label: 'Clicks', val: '18.4K' },
          { label: 'Conversions', val: '3.1K' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white/4 border border-white/8 p-2 text-center">
            <p className="text-xs font-semibold text-[#f0f0f5]">{s.val}</p>
            <p className="text-[9px] text-[#9494a5] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  demo: React.ReactNode;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Athlete Discovery',
    description: 'Search verified college athletes by sport, school, follower count, and AI-computed brand-fit score.',
    demo: <DemoDiscovery />,
    color: '#3d8bff',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'AI Campaign Builder',
    description: 'Describe your goal and let AI generate ready-to-launch campaign concepts, captions, and projected reach.',
    demo: <DemoCampaign />,
    color: '#a78bfa',
  },
  {
    icon: <FileCheck className="w-5 h-5" />,
    title: 'Smart Contracts',
    description: 'AI reviews every clause for red flags, suggests edits, and keeps both sides protected.',
    demo: <DemoContract />,
    color: '#00f292',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Campaign Insights',
    description: 'Track live reach, engagement, conversions, and ROI across every active partnership.',
    demo: <DemoInsights />,
    color: '#fb923c',
  },
];

// ── Animated number ───────────────────────────────────────────────────────────

function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-[#f0f0f5]">{value}</p>
      <p className="text-sm text-[#9494a5] mt-1">{label}</p>
    </div>
  );
}

// ── Floating badge ────────────────────────────────────────────────────────────

function FloatingBadge({ icon, text, className }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div className={`absolute flex items-center gap-2 px-3 py-2 rounded-full bg-[#141420]/90 border border-white/10 backdrop-blur-sm text-xs font-medium text-[#f0f0f5] shadow-lg ${className}`}>
      {icon}
      {text}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-cycle demo tabs
  useEffect(() => {
    const id = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-[#f0f0f5] overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#3d8bff] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#f0f0f5]">BlueChip<span className="text-[#3d8bff]">NIL</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-[#9494a5] hover:text-[#f0f0f5] transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm px-4 py-2 rounded-lg bg-[#3d8bff] text-white font-medium hover:bg-[#5a9fff] transition-colors"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#3d8bff]/10 blur-[120px]" />
        </div>

        {/* Floating decorations */}
        <FloatingBadge
          icon={<Instagram className="w-3.5 h-3.5 text-pink-400" />}
          text="84K followers"
          className="hidden md:flex top-40 left-[8%] animate-bounce"
          style={{ animationDuration: '3s' } as React.CSSProperties}
        />
        <FloatingBadge
          icon={<Shield className="w-3.5 h-3.5 text-[#00f292]" />}
          text="Contract verified"
          className="hidden md:flex top-56 right-[8%]"
        />
        <FloatingBadge
          icon={<TrendingUp className="w-3.5 h-3.5 text-[#3d8bff]" />}
          text="+340K reach"
          className="hidden md:flex bottom-24 left-[10%]"
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#3d8bff]/30 bg-[#3d8bff]/10 text-[#3d8bff] text-xs font-semibold mb-6">
            <Sparkles className="w-3 h-3" />
            The NIL platform built for athletes & brands
          </span>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
            College athletes.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3d8bff] to-[#7cb3ff]">Real deals.</span><br />
            Zero friction.
          </h1>

          <p className="text-lg md:text-xl text-[#9494a5] max-w-xl mx-auto mb-10 leading-relaxed">
            BlueChipNIL connects verified student-athletes with brands ready to partner — powered by AI matching, campaign tools, and smart contracts.
          </p>

          <button
            onClick={() => navigate('/auth')}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#3d8bff] text-white text-lg font-semibold hover:bg-[#5a9fff] transition-all shadow-[0_0_40px_rgba(61,139,255,0.3)] hover:shadow-[0_0_60px_rgba(61,139,255,0.45)]"
          >
            Start realizing your value
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="mt-4 text-xs text-[#9494a5]">Free to join · NCAA compliant · No hidden fees</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 md:px-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedStat value="2,400+" label="Verified athletes" />
          <AnimatedStat value="180+" label="Brand partners" />
          <AnimatedStat value="$3.2M+" label="Deals facilitated" />
          <AnimatedStat value="94%" label="Match satisfaction" />
        </div>
      </section>

      {/* ── Feature demos ── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, in one place</h2>
            <p className="text-[#9494a5] text-lg max-w-lg mx-auto">From finding the perfect match to signing the deal — BlueChipNIL handles it end to end.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Tab list */}
            <div className="space-y-3">
              {features.map((f, i) => (
                <button
                  key={f.title}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    activeFeature === i
                      ? 'border-white/15 bg-white/6 shadow-lg'
                      : 'border-white/5 bg-white/2 hover:bg-white/4'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: `${f.color}18`, color: f.color }}
                    >
                      {f.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${activeFeature === i ? 'text-[#f0f0f5]' : 'text-[#9494a5]'}`}>{f.title}</p>
                      <p className="text-xs text-[#9494a5] mt-0.5 leading-relaxed">{f.description}</p>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 transition-transform shrink-0"
                      style={{ color: activeFeature === i ? f.color : '#9494a5', transform: activeFeature === i ? 'rotate(90deg)' : 'none' }}
                    />
                  </div>
                  {/* Progress bar */}
                  {activeFeature === i && (
                    <div className="mt-3 h-0.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: f.color,
                          animation: 'progress 4s linear forwards',
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Demo panel */}
            <div
              className="rounded-2xl border border-white/8 bg-[#141420] p-5 min-h-[300px] transition-all"
              style={{ boxShadow: `0 0 40px ${features[activeFeature].color}18` }}
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/8">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-[#9494a5] font-mono">bluechipnil.com/{features[activeFeature].title.toLowerCase().replace(' ', '-')}</span>
              </div>
              {features[activeFeature].demo}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 md:px-12 bg-[#080810]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
          <p className="text-[#9494a5] text-center mb-16 text-lg">Get from signup to signed deal in minutes.</p>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-[#3d8bff]/60 via-[#3d8bff]/20 to-transparent hidden md:block" />

            <div className="space-y-10">
              {[
                {
                  step: '01',
                  title: 'Create your profile',
                  desc: 'Athletes add their sport, school, and social stats. Brands describe their goals and target audience.',
                  color: '#3d8bff',
                },
                {
                  step: '02',
                  title: 'Get matched by AI',
                  desc: 'Our model ranks athlete-brand compatibility based on audience fit, past performance, and campaign goals.',
                  color: '#a78bfa',
                },
                {
                  step: '03',
                  title: 'Launch your campaign',
                  desc: 'Use AI-generated concepts or upload your own brief. Preview, approve, and go live in minutes.',
                  color: '#00f292',
                },
                {
                  step: '04',
                  title: 'Sign and get paid',
                  desc: 'Smart contracts protect both parties. Athletes get paid on delivery — no chasing invoices.',
                  color: '#fb923c',
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-6 items-start">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border"
                    style={{ background: `${s.color}15`, color: s.color, borderColor: `${s.color}30` }}
                  >
                    {s.step}
                  </div>
                  <div className="pt-3">
                    <h3 className="font-semibold text-[#f0f0f5] mb-1">{s.title}</h3>
                    <p className="text-[#9494a5] text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#3d8bff]/20 to-[#3d8bff]/5 blur-xl" />
          <div className="relative rounded-3xl border border-[#3d8bff]/20 bg-[#141420] p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#3d8bff]/15 flex items-center justify-center mx-auto mb-6">
              <Zap className="w-7 h-7 text-[#3d8bff]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Start realizing<br />your value
            </h2>
            <p className="text-[#9494a5] text-lg mb-8 max-w-md mx-auto">
              Join thousands of athletes and brands already building partnerships on BlueChipNIL.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#3d8bff] text-white text-lg font-semibold hover:bg-[#5a9fff] transition-all shadow-[0_0_40px_rgba(61,139,255,0.25)] hover:shadow-[0_0_60px_rgba(61,139,255,0.4)]"
            >
              Get started — it's free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-4 text-xs text-[#9494a5]">No credit card required · NCAA compliant</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 md:px-12 border-t border-white/5 text-center text-[#9494a5] text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-[#3d8bff] flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-[#f0f0f5]">BlueChip<span className="text-[#3d8bff]">NIL</span></span>
        </div>
        <p>© {new Date().getFullYear()} BlueChipNIL. All rights reserved.</p>
      </footer>

      {/* Progress bar animation */}
      <style>{`
        @keyframes progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}
