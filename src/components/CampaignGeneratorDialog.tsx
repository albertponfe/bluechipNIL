import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { generateImage } from "../lib/ai";
import { Athlete } from "../lib/athletes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CampaignGeneratorDialogProps {
    athlete: Athlete | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    businessName: string;
}

export function CampaignGeneratorDialog({ athlete, open, onOpenChange, businessName }: CampaignGeneratorDialogProps) {
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>("16:9");

    async function handleGenerate() {
        if (!athlete) return;
        setLoading(true);
        setImageUrl(null);
        setErrorMsg(null);
        try {
            const data = await generateImage({
                model: "gemini-2.5-flash-image",
                contents: {
                    parts: [
                        { text: `Generate a high-quality, professional sports marketing photography style mockup showing an advertisement for a local business named "${businessName}". The ad features an athlete in ${athlete.sport} gear (no specific logos, just general sports gear). The ad should feel like a local Berkeley/Oakland area partnership. Clean typography, cinematic lighting.` }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio
                    }
                }
            });
            setImageUrl(data);
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to generate image.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-secondary" />
                        Campaign Asset Generator
                    </DialogTitle>
                    <DialogDescription>
                        Generate high-quality campaign mockups with Gemini.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 mb-4 items-end">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Aspect Ratio</label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                            <SelectTrigger>
                                <SelectValue placeholder="Aspect Ratio" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                <SelectItem value="4:3">4:3 (Landscape)</SelectItem>
                                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                                <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                                <SelectItem value="9:16">9:16 (Story)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {loading ? "Generating..." : "Generate"}
                    </Button>
                </div>

                <div className="flex-1 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-center p-4 min-h-[400px] overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                            <p className="text-sm">Gemini is rendering your campaign mockup...</p>
                        </div>
                    ) : errorMsg ? (
                        <div className="text-center text-destructive flex flex-col items-center gap-2">
                            <p className="font-semibold">Error Generating Image</p>
                            <p className="max-w-xs text-sm">{errorMsg}</p>
                        </div>
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Campaign Mockup"
                            className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                            <ImageIcon className="h-12 w-12 opacity-20" />
                            <p className="max-w-xs text-sm opacity-80">
                                Select options and click generate to create a custom campaign asset for {athlete?.name} x {businessName}.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
