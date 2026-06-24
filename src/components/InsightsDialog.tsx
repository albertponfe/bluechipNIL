import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import { generateText } from "../lib/ai";
import { Athlete } from "../lib/athletes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InsightsDialogProps {
    athlete: Athlete | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    businessName: string;
}

export function InsightsDialog({ athlete, open, onOpenChange, businessName }: InsightsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function loadInsights() {
        if (!athlete) return;
        setLoading(true);
        setInsights(null);
        setErrorMsg(null);
        try {
            const data = await generateText({
                model: "gemini-3.1-pro-preview",
                contents: `You are an expert NIL marketing consultant. Generate a compelling, data-driven report explaining why local business "${businessName}" should partner with student-athlete ${athlete.name} (Sport: ${athlete.sport}) from ${athlete.school} for a local marketing campaign. Include local area alignment, target demographic fit, and potential campaign ideas. Be concise but impactful. Address the business directly (e.g. "Why ${businessName} should partner with..."). Format as markdown.`,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });
            setInsights(data || "No insights generated.");
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to generate insights.");
        } finally {
            setLoading(false);
        }
    }

    // Auto load when opened if empty
    const handleOpenChange = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (isOpen && !insights && !loading && athlete) {
            loadInsights();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-secondary" />
                        AI Marketing Insights: {athlete?.name}
                    </DialogTitle>
                    <DialogDescription>
                        Research & Strategy tailored for {businessName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px] flex flex-col">
                    {loading ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">Gemini is researching {athlete?.name} using Google Search...</p>
                        </div>
                    ) : errorMsg ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-destructive">
                            <p className="font-semibold text-lg">Error Generating Insights</p>
                            <p className="max-w-md text-center text-sm">{errorMsg}</p>
                            <Button onClick={loadInsights} variant="outline" className="mt-4 gap-2 text-foreground">
                                <Sparkles className="h-4 w-4" />
                                Try Again
                            </Button>
                        </div>
                    ) : insights ? (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
                                <Markdown>{insights}</Markdown>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <Button onClick={loadInsights} variant="outline" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Generate Insights
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
