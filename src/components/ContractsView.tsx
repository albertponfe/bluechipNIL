import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Athlete } from "../lib/athletes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, ShieldCheck, Download, Plus, Loader2 } from "lucide-react";
import { ContractCustomizer } from "./ContractCustomizer";
import { jsPDF } from "jspdf";

interface ContractsViewProps {
    businessName: string;
    athletes: Athlete[];
}

interface Deal {
    id: string;
    athlete_name: string | null;
    title: string;
    status: string;
    created_at: string;
    contract_text: string | null;
}

export function ContractsView({ businessName, athletes }: ContractsViewProps) {
    const { user } = useAuth();
    const [view, setView] = useState<"list" | "create">("list");
    const [contracts, setContracts] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    const loadContracts = () => {
        if (!user) return;
        setLoading(true);
        supabase
            .from('deals')
            .select('id, athlete_name, title, status, created_at, contract_text')
            .eq('brand_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading contracts:', error);
                    return;
                }
                setContracts(data ?? []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadContracts();
    }, [user?.id]);

    const handleDownload = (contract: Deal) => {
        if (!contract.contract_text) return;
        const doc = new jsPDF();
        const lines = doc.splitTextToSize(contract.contract_text, 180);
        doc.text(lines, 15, 20);
        doc.save(`NIL_Agreement_${contract.title.replace(/\s+/g, '_')}.pdf`);
    };

    if (view === "create") {
        return (
            <ContractCustomizer
                onBack={() => { setView("list"); loadContracts(); }}
                businessName={businessName}
                athletes={athletes}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-left">
                    <h2 className="text-2xl font-bold">Secure NIL Contracts</h2>
                    <p className="text-muted-foreground text-sm">Standardized, legally-vetted templates for {businessName}.</p>
                </div>
                <Button
                    className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_0_20px_rgba(61,139,255,0.2)]"
                    onClick={() => setView("create")}
                >
                    <Plus className="h-4 w-4" />
                    Create New Contract
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <ShieldCheck className="h-5 w-5" />
                            Standardized NIL Agreement
                        </CardTitle>
                        <CardDescription>Industry standard template, AI-drafted per House v. NCAA settlement rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p>• Zero hidden fees</p>
                        <p>• Direct payment integration</p>
                        <p>• Intellectual property protection</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10" onClick={() => setView("create")}>Customize Template</Button>
                    </CardFooter>
                </Card>

                <div className="space-y-4 text-left">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading contracts...
                        </div>
                    ) : contracts.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-12">No contracts yet. Create your first one.</p>
                    ) : (
                        contracts.map(contract => (
                            <Card key={contract.id} className="bg-card border-border/40 hover:border-primary/30 transition-colors">
                                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                    <div>
                                        <CardTitle className="text-base font-bold">{contract.athlete_name || 'Unknown athlete'}</CardTitle>
                                        <CardDescription className="text-xs uppercase tracking-wider font-bold opacity-70">{contract.title}</CardDescription>
                                    </div>
                                    <Badge variant={contract.status === "accepted" ? "default" : "secondary"} className={contract.status === "accepted" ? "bg-accent-green/20 text-accent-green border-0 text-[10px] px-2 py-0.5" : "text-[10px] px-2 py-0.5"}>
                                        {contract.status === "accepted" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                        {contract.status}
                                    </Badge>
                                </CardHeader>
                                <CardFooter className="px-4 py-2 bg-black/10 flex justify-between items-center">
                                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                                        {new Date(contract.created_at).toLocaleDateString()}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
                                        disabled={!contract.contract_text}
                                        onClick={() => handleDownload(contract)}
                                    >
                                        <Download className="h-3 w-3" />
                                        PDF
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
