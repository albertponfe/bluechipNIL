import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { fetchAthletes, Athlete, calculateMatchScore, formatFollowers, formatEngagement, getLocalCredLabel } from "../lib/athletes";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Image as ImageIcon, Users, TrendingUp, Handshake, MapPin, FileCheck, LayoutDashboard, Instagram, LogOut, Loader2, UserCircle } from "lucide-react";
import { InsightsDialog } from "./InsightsDialog";
import { CampaignGeneratorDialog } from "./CampaignGeneratorDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractsView } from "./ContractsView";
import { AthleteCreatorView } from "./AthleteCreatorView";

interface BrandProfile {
    legal_name: string;
    display_name: string;
    website: string | null;
    industry: string | null;
    bio: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
}

interface BrandDraft {
    legal_name: string;
    display_name: string;
    website: string;
    industry: string;
    bio: string;
    city: string;
    region: string;
    country: string;
}

const EMPTY_BRAND_DRAFT: BrandDraft = {
    legal_name: "",
    display_name: "",
    website: "",
    industry: "",
    bio: "",
    city: "",
    region: "",
    country: "",
};

export function Dashboard() {
    const { user, userDoc, refreshToken } = useAuth();
    const [brandDraft, setBrandDraft] = useState<BrandDraft>(EMPTY_BRAND_DRAFT);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [activeTab, setActiveTab] = useState("discovery");
    const businessName = brandDraft.display_name || userDoc?.display_name || "Your Brand";
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loadingAthletes, setLoadingAthletes] = useState(true);
    const [selectedInsightAthlete, setSelectedInsightAthlete] = useState<Athlete | null>(null);
    const [selectedCampaignAthlete, setSelectedCampaignAthlete] = useState<Athlete | null>(null);

    useEffect(() => {
        fetchAthletes()
            .then(setAthletes)
            .catch((err) => console.error('Error loading athletes:', err))
            .finally(() => setLoadingAthletes(false));
    }, []);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('brands')
            .select('legal_name, display_name, website, industry, bio, city, region, country')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) console.error('Error loading brand profile:', error);
                if (data) {
                    const profile = data as BrandProfile;
                    setBrandDraft({
                        legal_name: profile.legal_name || "",
                        display_name: profile.display_name || "",
                        website: profile.website || "",
                        industry: profile.industry || "",
                        bio: profile.bio || "",
                        city: profile.city || "",
                        region: profile.region || "",
                        country: profile.country || "",
                    });
                }
            });
    }, [user?.id]);

    const patchBrandDraft = (fields: Partial<BrandDraft>) => setBrandDraft(prev => ({ ...prev, ...fields }));

    const handleSaveBrandProfile = async () => {
        if (!user) return;
        setSavingProfile(true);
        setProfileSaved(false);
        try {
            const { error: brandError } = await supabase.from('brands').update({
                legal_name: brandDraft.legal_name,
                display_name: brandDraft.display_name,
                website: brandDraft.website,
                industry: brandDraft.industry,
                bio: brandDraft.bio,
                city: brandDraft.city,
                region: brandDraft.region,
                country: brandDraft.country,
            }).eq('id', user.id);
            if (brandError) throw brandError;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ display_name: brandDraft.display_name })
                .eq('id', user.id);
            if (profileError) throw profileError;

            await refreshToken();
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
        } catch (e) {
            console.error('Error saving brand profile:', e);
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="flex-1 w-full bg-background text-foreground flex flex-col font-sans">
            <header className="h-[70px] px-[40px] flex items-center justify-between border-b border-border shrink-0" style={{ background: 'linear-gradient(to right, #050508, #0a0a14)' }}>
                <div className="font-[800] text-[20px] tracking-[2px] uppercase flex items-center gap-4">
                    <span style={{ background: 'linear-gradient(45deg, #3d8bff, #00f292)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        BLUECHIP NIL
                    </span>
                </div>
                <div className="flex items-center gap-[12px] text-[13px]">
                    <button
                        type="button"
                        onClick={() => setActiveTab("profile")}
                        title="Edit your profile"
                        className="flex items-center gap-[12px] group cursor-pointer bg-transparent border-none p-0"
                    >
                        <span className="font-medium group-hover:text-primary transition-colors">{businessName}</span>
                        <div className="w-[32px] h-[32px] rounded-full border border-primary overflow-hidden bg-[#2a2a35] flex items-center justify-center group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                    </button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => supabase.auth.signOut()}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-[24px] overflow-y-auto w-full">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-secondary/50 border border-border">
                            <TabsTrigger value="discovery" className="gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                Discovery
                            </TabsTrigger>
                            <TabsTrigger value="contracts" className="gap-2">
                                <FileCheck className="h-4 w-4" />
                                Contracts
                            </TabsTrigger>
                            <TabsTrigger value="athlete-studio" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Athlete Studio
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="gap-2">
                                <UserCircle className="h-4 w-4" />
                                My Profile
                            </TabsTrigger>
                        </TabsList>

                        <Badge variant="secondary" className="px-3 py-1 font-medium bg-black/40 text-primary border border-primary/20">
                            <MapPin className="h-3 w-3 mr-1" />
                            Region: Alameda County
                        </Badge>
                    </div>

                    <TabsContent value="discovery" className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Marketplace</h2>
                            <p className="text-muted-foreground text-[13px]">
                                Real-time performance matching algorithm for {businessName}.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="bg-[#141420] border-border/50">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Available Reach</CardTitle>
                                    <Users className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{formatFollowers(athletes.reduce((acc, a) => acc + a.followers, 0))}+</div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3 text-[#00f292]" />
                                        <span className="text-[#00f292] font-bold">+12%</span> local growth
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#141420] border-border/50">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Avg Engagement</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-[#00f292]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">
                                        {athletes.length ? formatEngagement(athletes.reduce((acc, a) => acc + a.engagementRate, 0) / athletes.length) : '0.0%'}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 tracking-tight">Benchmark competitive advantage</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#141420] border-border/50">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Contract Efficiency</CardTitle>
                                    <Handshake className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">4.2h</div>
                                    <p className="text-xs text-muted-foreground mt-1">Avg time to signature (no agents)</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="pt-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold tracking-tight text-white/90">High-Performing Candidates</h3>
                                <div className="text-xs text-primary font-bold uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => { setLoadingAthletes(true); fetchAthletes().then(setAthletes).finally(() => setLoadingAthletes(false)); }}>
                                    Refresh Matches
                                </div>
                            </div>

                            {loadingAthletes ? (
                                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading athletes...
                                </div>
                            ) : athletes.length === 0 ? (
                                <p className="text-muted-foreground text-sm py-12 text-center">No athletes in the marketplace yet.</p>
                            ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {athletes.map(athlete => (
                                    <Card key={athlete.id} className="bg-[#141420] border-border/40 overflow-hidden hover:border-primary/50 transition-all group flex flex-col shadow-xl">
                                        <div className="aspect-[16/10] overflow-hidden relative bg-black/40">
                                            <img
                                                src={athlete.imageUrl}
                                                alt={athlete.name}
                                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#141420] via-transparent to-transparent opacity-60" />
                                            <Badge className="absolute top-3 left-3 bg-black/60 text-foreground hover:bg-black/80 backdrop-blur-md border-border/40 font-bold px-2 py-0.5 text-[10px] tracking-wide">
                                                {athlete.school}
                                            </Badge>
                                            <div className="absolute bottom-3 right-3 flex flex-col items-end">
                                               <span className="text-3xl font-light text-primary tracking-tighter">{calculateMatchScore(athlete)}%</span>
                                               <span className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase">Match Score</span>
                                            </div>
                                        </div>
                                        <CardHeader className="p-5 pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{athlete.name}</CardTitle>
                                                    <CardDescription className="text-xs mt-0.5 text-primary/70 font-semibold tracking-wide uppercase">{athlete.sport}</CardDescription>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <div className="text-base font-bold text-white flex items-center justify-end gap-1.5">
                                                        {formatFollowers(athlete.followers)}
                                                        {athlete.instagram && (
                                                            <a href={`https://instagram.com/${athlete.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                                                <Instagram className="w-4 h-4 text-pink-500" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Followers</div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-5 pt-0 flex-1">
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {athlete.bio}
                                            </p>
                                            <div className="mt-4 flex gap-4 text-sm font-medium border-t border-border/20 pt-4">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-[8px] uppercase font-bold tracking-widest">Engagement</span>
                                                    <span className="text-[#00f292] font-extrabold">{formatEngagement(athlete.engagementRate)}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-[8px] uppercase font-bold tracking-widest">Local Cred</span>
                                                    <span className="text-primary font-extrabold">{getLocalCredLabel(athlete.localCred)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-5 bg-black/20 border-t border-border/40 flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-[11px] font-bold uppercase tracking-wider text-white border-border/60 hover:bg-white/5 hover:border-primary transition-all h-9"
                                                onClick={() => setSelectedInsightAthlete(athlete)}
                                            >
                                                <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
                                                AI Insights
                                            </Button>
                                            <Button
                                                variant="default"
                                                className="w-full justify-start text-[11px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/80 text-white shadow-[0_0_20px_rgba(61,139,255,0.15)] h-9"
                                                onClick={() => setSelectedCampaignAthlete(athlete)}
                                            >
                                                <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                                Campaign Mock
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="contracts">
                        <ContractsView businessName={businessName} athletes={athletes} />
                    </TabsContent>

                    <TabsContent value="athlete-studio">
                        <AthleteCreatorView />
                    </TabsContent>

                    <TabsContent value="profile" className="space-y-6">
                        <Card className="bg-[#141420] border-border/50 max-w-3xl">
                            <CardHeader>
                                <CardTitle>Business Profile</CardTitle>
                                <CardDescription>Update the information athletes and the marketplace see for your brand.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Display Name</label>
                                        <Input value={brandDraft.display_name} onChange={(e) => patchBrandDraft({ display_name: e.target.value })} className="bg-black/30 border-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Legal Name</label>
                                        <Input value={brandDraft.legal_name} onChange={(e) => patchBrandDraft({ legal_name: e.target.value })} className="bg-black/30 border-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Website</label>
                                        <Input value={brandDraft.website} onChange={(e) => patchBrandDraft({ website: e.target.value })} placeholder="https://" className="bg-black/30 border-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Industry</label>
                                        <Input value={brandDraft.industry} onChange={(e) => patchBrandDraft({ industry: e.target.value })} className="bg-black/30 border-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">City</label>
                                        <Input value={brandDraft.city} onChange={(e) => patchBrandDraft({ city: e.target.value })} className="bg-black/30 border-white/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Region / State</label>
                                        <Input value={brandDraft.region} onChange={(e) => patchBrandDraft({ region: e.target.value })} className="bg-black/30 border-white/10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio</label>
                                    <Textarea
                                        value={brandDraft.bio}
                                        onChange={(e) => patchBrandDraft({ bio: e.target.value })}
                                        className="bg-black/30 border-white/10 min-h-[100px]"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-white/5 p-4 flex items-center justify-end gap-3">
                                {profileSaved && <span className="text-xs text-primary font-medium">Saved!</span>}
                                <Button className="bg-primary hover:bg-primary/80 text-white font-bold" onClick={handleSaveBrandProfile} disabled={savingProfile}>
                                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>

                <InsightsDialog
                    open={!!selectedInsightAthlete}
                    onOpenChange={(open) => !open && setSelectedInsightAthlete(null)}
                    athlete={selectedInsightAthlete}
                    businessName={businessName}
                />

                <CampaignGeneratorDialog
                    open={!!selectedCampaignAthlete}
                    onOpenChange={(open) => !open && setSelectedCampaignAthlete(null)}
                    athlete={selectedCampaignAthlete}
                    businessName={businessName}
                />
            </main>
        </div>
    );
}
