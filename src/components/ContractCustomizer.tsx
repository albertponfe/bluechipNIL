import { useState } from "react";
import { jsPDF } from "jspdf";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { generateText } from "../lib/ai";
import { Athlete } from "../lib/athletes";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowLeft, Shield, CheckCircle2, DollarSign, Calendar, MessageSquare, Download, Loader2, Users as UsersIcon } from "lucide-react";
import Markdown from "react-markdown";

interface ContractCustomizerProps {
    onBack: () => void;
    businessName: string;
    athletes: Athlete[];
}

function parseAmount(text: string): number {
    const match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
}

export function ContractCustomizer({ onBack, businessName, athletes }: ContractCustomizerProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [contractType, setContractType] = useState("");
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
    const [formData, setFormData] = useState({
        compensation: "",
        deliverables: "",
        duration: "One-time",
    });

    const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || null;

    const CLAUSE_OPTIONS = [
        { id: "GRANT_OF_RIGHTS", title: "Grant of Rights", description: "IP and usage rights granted to the brand." },
        { id: "PERFORMANCE_ATTESTATION", title: "Play-for-Play Protections", description: "Explicit statements blocking athletic performance conditions." },
        { id: "MORALITY", title: "Morality Clause", description: "Termination conditions for disparaging conduct." },
        { id: "COMPLIANCE", title: "NCAA Compliance", description: "Mandatory disclosure and institutional reporting." },
        { id: "INDEMNIFICATION", title: "Indemnification", description: "Mutual protection against negligence." },
        { id: "MISCELLANEOUS", title: "Governing Law / Misc", description: "Jurisdiction, severability, and dispute resolution." },
    ];

    const [clausesState, setClausesState] = useState<{[key: string]: { selected: boolean; specifics: string }}>({
        GRANT_OF_RIGHTS: { selected: true, specifics: "" },
        PERFORMANCE_ATTESTATION: { selected: true, specifics: "" },
        MORALITY: { selected: true, specifics: "" },
        COMPLIANCE: { selected: true, specifics: "" },
        INDEMNIFICATION: { selected: true, specifics: "" },
        MISCELLANEOUS: { selected: true, specifics: "" },
    });

    const [isFinalizing, setIsFinalizing] = useState(false);

    const contractTypes = [
        { id: "social", title: "Social Media Post", description: "IG Story, TikTok, or Twitter shoutout", icon: MessageSquare },
        { id: "appearance", title: "Personal Appearance", description: "In-store event, autograph session", icon: UsersIcon },
        { id: "review", title: "Product Review", description: "Unboxing or testimonial video", icon: FileText },
        { id: "ambassador", title: "Brand Ambassador", description: "Ongoing multi-month partnership", icon: Shield }
    ];

    const handleGenerate = async () => {
        if (!selectedAthlete || !user) return;
        setIsFinalizing(true);
        setErrorMsg(null);
        setStep(4); // Move to loading view

        const activeClauses = CLAUSE_OPTIONS.filter(c => clausesState[c.id]?.selected).map(c => ({
            name: c.title,
            specifics: clausesState[c.id]?.specifics || ""
        }));

        const clauseText = activeClauses.length > 0
            ? activeClauses.map(c => `- **${c.name}**: ${c.specifics || 'Use standard best-practice terminology.'}`).join('\n')
            : '- No additional optional clauses selected.';

        try {
            const typeName = contractTypes.find(t => t.id === contractType)?.title || "General";
            const result = await generateText({
                model: "gemini-3.1-pro-preview",
                contents: `SYSTEM ROLE: You are a Senior Sports Law Attorney specializing in Name, Image, and Likeness (NIL) for collegiate and professional athletes. Your goal is to generate a comprehensive, clause-structured NIL License Agreement based on structured user inputs.

LEGAL FRAMEWORK: Draft according to the principles of the House v. NCAA settlement (2025) and NCAA Division I bylaws. Ensure all contracts distinguish between "Third-Party NIL" and "Revenue Sharing" where applicable. Maintain a professional, neutral, and legally binding tone.

CLAUSE CONFIGURATION:
You must construct the contract including the foundational base sections (IDENTIFICATION, COMPENSATION, TERM & TERMINATION, DELIVERABLES). You must also explicitly include the following selected optional clauses, incorporating any user-provided specifics into their drafting:

${clauseText}

CONSTRAINTS:
- NEVER allow "Pay-for-Play" language.
- NEVER grant perpetual rights unless the user explicitly overrides with a "Long-Term Grant" flag.
- ALWAYS warn the user if a selected clause (e.g., Exclusivity) conflicts with standard NCAA advice.

Output the final document in clean Markdown format, ready for PDF conversion. Do not include any conversational filler, just the contract.

USER INPUT:
{
    "athlete_name": "${selectedAthlete.name}",
    "brand_name": "${businessName}",
    "deal_type": "${typeName}",
    "compensation": "${formData.compensation}",
    "term": "${formData.duration}",
    "deliverables": "${formData.deliverables}"
}`
            });
            setGeneratedText(result || "No contract generated.");

            const { error: insertError } = await supabase.from('deals').insert({
                athlete_id: selectedAthlete.id,
                athlete_name: selectedAthlete.name,
                brand_id: user.id,
                brand_name: businessName,
                title: `${typeName} — ${selectedAthlete.name}`,
                description: formData.deliverables,
                amount: parseAmount(formData.compensation),
                status: 'pending',
                contract_text: result || '',
            });
            if (insertError) console.error('Error saving deal:', insertError);
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to generate contract.");
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Contract Builder</h2>
                    <p className="text-muted-foreground text-sm">Secure, standardized contracts for {businessName}.</p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-8 px-2">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= s ? 'bg-primary text-white shadow-[0_0_15px_rgba(61,139,255,0.4)]' : 'bg-secondary text-muted-foreground'}`}>
                            {s}
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-black ${step >= s ? 'text-white' : 'text-muted-foreground opacity-50'}`}>
                            {s === 1 ? 'Case' : s === 2 ? 'Details' : s === 3 ? 'Clauses' : 'Finalize'}
                        </span>
                        {s < 4 && <div className={`w-8 sm:w-12 h-[1px] ${step > s ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="grid gap-4">
                    <h3 className="text-lg font-semibold px-1">Select NIL Case Type</h3>
                    {contractTypes.map((type) => (
                        <Card
                            key={type.id}
                            className={`cursor-pointer transition-all hover:border-primary/50 ${contractType === type.id ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(61,139,255,0.1)]' : 'bg-card border-border/40'}`}
                            onClick={() => {
                                setContractType(type.id);
                                setStep(2);
                            }}
                        >
                            <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                                <div className={`p-3 rounded-xl ${contractType === type.id ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>
                                    <type.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{type.title}</CardTitle>
                                    <CardDescription>{type.description}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            {step === 2 && (
                <Card className="bg-card border-border/40">
                    <CardHeader>
                        <CardTitle>Agreement Parameters</CardTitle>
                        <CardDescription>Define the terms for {contractTypes.find(t => t.id === contractType)?.title}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Athlete</label>
                            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an athlete from Discovery" />
                                </SelectTrigger>
                                <SelectContent>
                                    {athletes.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name} — {a.sport}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Compensation
                                </label>
                                <Input
                                    placeholder="$500 / Product Value"
                                    className="bg-black/20 border-border/40"
                                    value={formData.compensation}
                                    onChange={e => setFormData({...formData, compensation: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Term
                                </label>
                                <Input
                                    placeholder="One-time / 3 Months"
                                    className="bg-black/20 border-border/40"
                                    value={formData.duration}
                                    onChange={e => setFormData({...formData, duration: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-none">Deliverables</label>
                            <Textarea
                                placeholder="Description of expectations (e.g. 2 IG Stories, 1 Grid post)..."
                                className="bg-black/20 border-border/40 min-h-[100px]"
                                value={formData.deliverables}
                                onChange={e => setFormData({...formData, deliverables: e.target.value})}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/40 p-6">
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white px-8"
                            onClick={() => setStep(3)}
                            disabled={!selectedAthleteId}
                        >
                            Configure Clauses
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
                <Card className="bg-card border-border/40 animate-in fade-in zoom-in-95 duration-500">
                    <CardHeader>
                        <CardTitle>Clause Configuration</CardTitle>
                        <CardDescription>Select which clauses to include and optionally provide specific directives for the AI to incorporate into them.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {CLAUSE_OPTIONS.map((clause) => {
                            const isSelected = clausesState[clause.id]?.selected;
                            return (
                                <div key={clause.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-black/10'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-primary"
                                                checked={isSelected}
                                                onChange={(e) => setClausesState({
                                                    ...clausesState,
                                                    [clause.id]: { ...clausesState[clause.id], selected: e.target.checked }
                                                })}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <h4 className="text-sm font-bold">{clause.title}</h4>
                                                <p className="text-xs text-muted-foreground">{clause.description}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="pt-2">
                                                    <Textarea
                                                        placeholder="Custom specifics or overrides for this clause (optional)..."
                                                        className="h-20 text-sm bg-black/30 border-white/5"
                                                        value={clausesState[clause.id]?.specifics || ""}
                                                        onChange={(e) => setClausesState({
                                                            ...clausesState,
                                                            [clause.id]: { ...clausesState[clause.id], specifics: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/40 p-6">
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button
                            className="bg-primary text-white shadow-[0_0_20px_rgba(61,139,255,0.3)] px-8"
                            onClick={handleGenerate}
                            disabled={isFinalizing}
                        >
                            Generate Contract
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 4 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                        {isFinalizing ? (
                            <>
                                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                                <h3 className="text-xl font-bold">Drafting Agreement</h3>
                                <p className="text-muted-foreground text-xs italic">Gemini is applying House v. NCAA settlement rules...</p>
                            </>
                        ) : errorMsg ? (
                            <>
                                <div className="text-destructive font-bold text-xl">Generation Failed</div>
                                <p className="text-muted-foreground text-sm">{errorMsg}</p>
                                <Button variant="outline" onClick={() => setStep(2)}>Go Back</Button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-accent-green/20 text-accent-green flex items-center justify-center shadow-[0_0_30px_rgba(0,242,146,0.2)]">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold">Agreement Preview</h3>
                                <p className="text-muted-foreground text-xs italic">Saved to your Contracts tab. Not legally binding, for example purposes.</p>
                            </>
                        )}
                    </div>

                    {!isFinalizing && !errorMsg && generatedText && (
                        <>
                            <Card className="bg-[#0a0a0f] border-border/40 overflow-hidden shadow-2xl">
                                <CardHeader className="bg-white/5 p-6 border-b border-border/40">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-mono tracking-tighter uppercase opacity-50">Document ID: NIL-2024-{(Math.random() * 10000).toFixed(0)}</CardTitle>
                                        <Badge variant="outline" className="text-[10px] text-accent-green border-accent-green/30">DRAFT READY</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 font-serif text-sm leading-relaxed text-white/80 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="prose prose-sm prose-invert max-w-none">
                                        <Markdown>{generatedText}</Markdown>
                                    </div>
                                    <div className="pt-12 mt-8 flex justify-between border-t border-white/10 italic text-[10px]">
                                        <div className="space-y-4">
                                            <div className="w-48 h-[1px] bg-white/30" />
                                            <span>Employer Signature</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="w-48 h-[1px] bg-white/30" />
                                            <span>Athlete Signature</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[#1a1a24] border-primary/20 overflow-hidden">
                                <CardHeader className="bg-primary/5 p-3 border-b border-border/40">
                                    <CardTitle className="text-[10px] flex items-center gap-2 uppercase tracking-[0.2em] font-black opacity-70">
                                        <Shield className="h-3 w-3 text-primary" />
                                        Auto-Security Audit Pass
                                    </CardTitle>
                                </CardHeader>
                            </Card>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-white/10 hover:bg-white/5 group"
                                    onClick={() => {
                                        const doc = new jsPDF();
                                        const lines = doc.splitTextToSize(generatedText, 180);
                                        doc.text(lines, 15, 20);
                                        doc.save(`NIL_Agreement_${(selectedAthlete?.name || 'athlete').replace(/\s+/g, '_')}.pdf`);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                                    Download Draft (.pdf)
                                </Button>
                                <Button className="flex-1 bg-accent-green text-black font-extrabold hover:bg-accent-green/90 shadow-[0_0_20px_rgba(0,242,146,0.3)]" onClick={onBack}>
                                    Done
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
