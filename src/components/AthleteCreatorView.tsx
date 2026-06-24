import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Share2, LineChart, PlayCircle, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AthleteCreatorView() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-left">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold">Creator Studio</h2>
                    <p className="text-muted-foreground text-sm">Empowering athletes to build world-class brands.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                    <PlusCircle className="h-4 w-4" />
                    New Campaign
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 overflow-hidden bg-[#1a1a24] border-border/50">
                    <CardHeader className="bg-gradient-to-r from-primary/20 to-transparent">
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Campaign Builder
                        </CardTitle>
                        <CardDescription>Drag and drop assets to prepare your NIL deliverables.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 border-t border-border/50">
                        <div className="aspect-video bg-black/40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-dashed border-2 border-border/50 m-6 rounded-xl">
                            <PlayCircle className="h-12 w-12 opacity-20" />
                            <div className="text-center">
                                <p className="font-medium">No active campaign media</p>
                                <p className="text-sm opacity-50">Upload videos or photos to start editing</p>
                            </div>
                            <Button variant="outline" size="sm">Select Files</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <LineChart className="h-4 w-4 text-accent-green text-[#00f292]" />
                                Your Growth
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold">+241</span>
                                    <span className="text-xs text-accent-green text-[#00f292] font-bold">Followers (7d)</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00f292] w-3/4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-primary" />
                                Media Kit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">Share your performance stats with businesses in one click.</p>
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">PDF Kit</Badge>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">Social Insight</Badge>
                            </div>
                            <Button variant="outline" className="w-full text-xs h-8">Copy Public URL</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
