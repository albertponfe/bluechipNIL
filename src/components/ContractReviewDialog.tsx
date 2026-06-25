import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, Send, Building2, DollarSign, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface Deal {
    id: string;
    athlete_id: string;
    athlete_name: string | null;
    brand_id: string | null;
    brand_name: string;
    title: string;
    description: string | null;
    amount: number;
    status: string;
    contract_text: string | null;
    created_at: string;
}

interface ContractReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deal: Deal | null;
}

export function ContractReviewDialog({ open, onOpenChange, deal }: ContractReviewDialogProps) {
    const [step, setStep] = useState(1);
    const [modificationRequest, setModificationRequest] = useState("");
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        if (open) {
            setStep(1);
            setModificationRequest("");
        }
    }, [open, deal?.id]);

    if (!deal) return null;

    const handleSign = async () => {
        setSigning(true);
        try {
            const { error } = await supabase.from('deals').update({ status: 'accepted' }).eq('id', deal.id);
            if (error) throw error;

            // Notify via email after successful signing
            await supabase.functions.invoke('send-email', {
                body: {
                    to: 'albertponferrada@berkeley.edu',
                    subject: `Contract signed: ${deal.title}`,
                    html: `<p><strong>${deal.athlete_name ?? 'An athlete'}</strong> signed the deal "<strong>${deal.title}</strong>" with ${deal.brand_name} for $${deal.amount.toLocaleString()}.</p>`,
                },
            });

            onOpenChange(false);
        } catch (e) {
            console.error('Error signing deal:', e);
        } finally {
            setSigning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] bg-[#0a0a0f] border-border/50 text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileText className="h-5 w-5 text-primary" />
                        Contract Review
                    </DialogTitle>
                    <DialogDescription>
                        Review the proposed NIL agreement from {deal.brand_name}. We've highlighted important clauses.
                    </DialogDescription>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Brand</div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    {deal.brand_name}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Compensation</div>
                                <div className="flex items-center gap-2 font-medium text-accent-green">
                                    <DollarSign className="h-4 w-4" />
                                    ${deal.amount?.toLocaleString() ?? 0}
                                </div>
                            </div>
                        </div>

                        {deal.description && (
                            <div className="p-4 rounded-lg bg-black/40 border border-white/5">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Deliverables</h4>
                                <p className="text-sm text-foreground/80">{deal.description}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AI Clause Analysis</h4>

                            <div className="p-4 rounded-lg bg-black/40 border border-green-500/20 space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="font-bold text-sm">Performance Attestation</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Standard NCAA-compliant clause confirming this is not a pay-for-play agreement. Safe to sign.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-2 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 text-orange-500">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-bold text-sm">Flagged: Exclusivity Term</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30">Requires Attention</Badge>
                                </div>
                                <p className="text-xs text-orange-400/80 italic">
                                    Review the full draft below (or in the Contracts tab on the business side) for any post-contract exclusivity period. Long exclusivity windows are common but should match the deal's length and scope.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button variant="outline" className="border-white/10" onClick={() => setStep(2)}>
                                Suggest Modifications
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(61,139,255,0.3)]"
                                onClick={handleSign}
                                disabled={signing}
                            >
                                {signing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Sign & Accept Contract
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Request Modifications</label>
                            <p className="text-xs text-muted-foreground">
                                Tell {deal.brand_name} what you'd like to change. We'll send this back to them as a formal counter-proposal.
                            </p>
                        </div>
                        <Textarea
                            placeholder="e.g., 'I would like to reduce the exclusivity period and limit it strictly to direct competitors...'"
                            className="bg-black/30 border-white/10 min-h-[150px]"
                            value={modificationRequest}
                            onChange={(e) => setModificationRequest(e.target.value)}
                        />
                        <div className="flex gap-3 justify-end pt-4">
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-white"
                                disabled={!modificationRequest}
                                onClick={() => onOpenChange(false)}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send Counter-Proposal
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
