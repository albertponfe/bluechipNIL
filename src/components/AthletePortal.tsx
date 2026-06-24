import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Copy, Instagram, Play, CheckCircle2, DollarSign, Upload, Bell, TrendingUp, Handshake, ShieldCheck, MapPin, FileCheck, Info, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContractReviewDialog, Deal } from "./ContractReviewDialog";
import { SchoolAutocomplete } from "./SchoolAutocomplete";
import { COLLEGE_SPORTS } from "../lib/collegeSports";

interface AthleteProfile {
    name: string;
    sport: string;
    university: string;
    year: string | null;
    position: string | null;
    bio: string;
    photo_url: string | null;
    instagram: string | null;
    twitter: string | null;
    tiktok: string | null;
    followers: number;
    engagement_rate: number;
}

interface ProfileDraft {
    name: string;
    sport: string;
    university: string;
    year: string;
    position: string;
    instagram: string;
    twitter: string;
    tiktok: string;
    bio: string;
}

const EMPTY_DRAFT: ProfileDraft = {
    name: "",
    sport: "",
    university: "",
    year: "",
    position: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    bio: "",
};

export function AthletePortal() {
    const { user, userDoc, refreshToken } = useAuth();
    const [profileData, setProfileData] = useState<AthleteProfile | null>(null);
    const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState("opportunities");

    const [opportunities, setOpportunities] = useState<Deal[]>([]);
    const [pastDeals, setPastDeals] = useState<Deal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoadingProfile(true);
        supabase
            .from('athletes')
            .select('name, sport, university, year, position, bio, photo_url, instagram, twitter, tiktok, followers, engagement_rate')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) console.error('Error loading athlete profile:', error);
                if (data) {
                    const profile = data as AthleteProfile;
                    setProfileData(profile);
                    setDraft({
                        name: profile.name || "",
                        sport: profile.sport || "",
                        university: profile.university || "",
                        year: profile.year || "",
                        position: profile.position || "",
                        instagram: profile.instagram || "",
                        twitter: profile.twitter || "",
                        tiktok: profile.tiktok || "",
                        bio: profile.bio || "",
                    });
                }
            })
            .finally(() => setLoadingProfile(false));

        loadDeals();
    }, [user?.id]);

    const loadDeals = () => {
        if (!user) return;
        supabase
            .from('deals')
            .select('id, athlete_id, athlete_name, brand_id, brand_name, title, description, amount, status, contract_text, created_at')
            .eq('athlete_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading deals:', error);
                    return;
                }
                const all = (data ?? []) as Deal[];
                setOpportunities(all.filter(d => d.status === 'pending'));
                setPastDeals(all.filter(d => d.status === 'accepted' || d.status === 'completed'));
            });
    };

    const patchDraft = (fields: Partial<ProfileDraft>) => setDraft(prev => ({ ...prev, ...fields }));

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setSaved(false);
        try {
            const { error: athleteError } = await supabase.from('athletes').update({
                name: draft.name,
                sport: draft.sport,
                university: draft.university,
                year: draft.year,
                position: draft.position,
                instagram: draft.instagram,
                twitter: draft.twitter,
                tiktok: draft.tiktok,
                bio: draft.bio,
            }).eq('id', user.id);
            if (athleteError) throw athleteError;

            // Keep the shared profiles.display_name in sync with the athlete's name.
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ display_name: draft.name })
                .eq('id', user.id);
            if (profileError) throw profileError;

            setProfileData(prev => prev ? { ...prev, ...draft } : prev);
            await refreshToken();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error('Error saving profile:', e);
        } finally {
            setSaving(false);
        }
    };

    const openReview = (deal: Deal) => {
        setSelectedDeal(deal);
        setReviewDialogOpen(true);
    };

    const displayName = draft.name || profileData?.name || userDoc?.display_name || user?.email || "Athlete";
    const photoUrl = profileData?.photo_url || `https://picsum.photos/seed/${user?.id}/300/375`;

    if (loadingProfile) {
        return (
            <div className="flex-1 w-full bg-[#050508] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-[#050508] text-foreground flex flex-col font-sans">
            <header className="h-[70px] px-[40px] flex items-center justify-between border-b border-border shrink-0 bg-[#0a0a14]">
                <div className="font-[800] text-[20px] tracking-[2px] uppercase flex items-center gap-4">
                    <span style={{ background: 'linear-gradient(45deg, #00f292, #3d8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        BLUECHIP ATHLETE
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white">
                        <Bell className="h-4 w-4" />
                        {opportunities.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive border border-background"></span>
                        )}
                    </Button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("profile")}
                        title="Edit your profile"
                        className="flex items-center gap-[12px] text-[13px] group cursor-pointer bg-transparent border-none p-0"
                    >
                        <span className="font-medium text-white group-hover:text-[#00f292] transition-colors">{displayName}</span>
                        <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[#00f292] group-hover:ring-2 group-hover:ring-[#00f292]/50 transition-all">
                            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                    </button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => supabase.auth.signOut()}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-[24px] max-w-7xl mx-auto w-full overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-secondary/50 border border-border">
                        <TabsTrigger value="opportunities" className="gap-2">
                            <Handshake className="h-4 w-4" />
                            Opportunities {opportunities.length > 0 && <Badge className="ml-1 bg-primary text-[9px] px-1.5 py-0">{opportunities.length} New</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="gap-2">
                            <Upload className="h-4 w-4" />
                            My Profile
                        </TabsTrigger>
                        <TabsTrigger value="compliance" className="gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Compliance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="md:col-span-1 space-y-6">
                                <Card className="bg-[#141420] border-border/50 overflow-hidden">
                                    <div className="aspect-[4/5] relative">
                                        <img src={photoUrl} alt={displayName} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#141420] via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4">
                                            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
                                            <p className="text-primary font-medium">{draft.sport || profileData?.sport}</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            {draft.university || profileData?.university}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-black/30 p-2 rounded-md border border-white/5">
                                                <div className="text-white font-bold text-lg">{profileData?.followers ?? 0}</div>
                                                <div className="text-muted-foreground uppercase opacity-70">Followers</div>
                                            </div>
                                            <div className="bg-black/30 p-2 rounded-md border border-white/5">
                                                <div className="text-[#00f292] font-bold text-lg">{((profileData?.engagement_rate ?? 0) * 100).toFixed(1)}%</div>
                                                <div className="text-muted-foreground uppercase opacity-70">Engagement</div>
                                            </div>
                                        </div>
                                        <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                                            Change Photo
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-[#141420] border-border/50">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Social Accounts</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-md border border-white/5">
                                            <Instagram className="h-5 w-5 text-pink-500 shrink-0" />
                                            <Input
                                                value={draft.instagram}
                                                onChange={(e) => patchDraft({ instagram: e.target.value })}
                                                placeholder="Instagram handle"
                                                className="bg-transparent border-none h-7 px-0 focus-visible:ring-0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-md border border-white/5">
                                            <span className="text-sm font-bold text-sky-400 w-5 text-center shrink-0">X</span>
                                            <Input
                                                value={draft.twitter}
                                                onChange={(e) => patchDraft({ twitter: e.target.value })}
                                                placeholder="Twitter / X handle"
                                                className="bg-transparent border-none h-7 px-0 focus-visible:ring-0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-md border border-white/5">
                                            <Play className="h-5 w-5 fill-white shrink-0" />
                                            <Input
                                                value={draft.tiktok}
                                                onChange={(e) => patchDraft({ tiktok: e.target.value })}
                                                placeholder="TikTok handle"
                                                className="bg-transparent border-none h-7 px-0 focus-visible:ring-0"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <Card className="bg-[#141420] border-border/50">
                                    <CardHeader>
                                        <CardTitle>Profile Details</CardTitle>
                                        <CardDescription>Update your public facing representation</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</label>
                                                <Input value={draft.name} onChange={(e) => patchDraft({ name: e.target.value })} className="bg-black/30 border-white/10" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sport</label>
                                                <Select value={draft.sport || undefined} onValueChange={(v) => patchDraft({ sport: v })}>
                                                    <SelectTrigger className="w-full bg-black/30 border-white/10">
                                                        <SelectValue placeholder="Select a sport" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {COLLEGE_SPORTS.map((sport) => (
                                                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">University</label>
                                                <SchoolAutocomplete
                                                    value={draft.university}
                                                    onChange={(name) => patchDraft({ university: name })}
                                                    placeholder="Start typing a school..."
                                                    inputClassName="bg-black/30 border-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Year</label>
                                                <Input value={draft.year} onChange={(e) => patchDraft({ year: e.target.value })} placeholder="e.g. Junior" className="bg-black/30 border-white/10" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Position</label>
                                                <Input value={draft.position} onChange={(e) => patchDraft({ position: e.target.value })} placeholder="e.g. Point Guard" className="bg-black/30 border-white/10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio & Branding</label>
                                            <Textarea
                                                value={draft.bio}
                                                onChange={(e) => patchDraft({ bio: e.target.value })}
                                                className="bg-black/30 border-white/10 min-h-[100px]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                                                <span>Minimum Deal Size</span>
                                                <Badge variant="outline" className="text-[9px] opacity-50">Private</Badge>
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input defaultValue="500" className="pl-9 bg-black/30 border-white/10" />
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t border-white/5 p-4 flex items-center justify-end gap-3">
                                        {saved && <span className="text-xs text-[#00f292] font-medium">Saved!</span>}
                                        <Button className="bg-[#00f292] hover:bg-[#00f292]/80 text-black font-bold" onClick={handleSaveProfile} disabled={saving}>
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card className="bg-gradient-to-br from-primary/10 to-[#00f292]/10 border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-[#00f292]" />
                                            Your Bluechip Value
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-foreground/80 mb-4">
                                            Your engagement rate of {((profileData?.engagement_rate ?? 0) * 100).toFixed(1)}% puts you in a strong position with local NIL brands. Keep your profile and socials up to date to maximize match quality.
                                        </p>
                                        <Button variant="outline" className="border-[#00f292]/30 text-[#00f292] hover:bg-[#00f292]/10 bg-black/40 mt-2">
                                            Generate AI Media Kit (.pdf)
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="opportunities">
                        <Card className="bg-[#141420] border-border/50">
                            <CardHeader>
                                <CardTitle>Inbound Deals</CardTitle>
                                <CardDescription>Businesses tracking your profile</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {opportunities.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-8">No pending offers right now.</p>
                                ) : (
                                <div className="space-y-4">
                                    {opportunities.map(deal => (
                                        <div key={deal.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                                    <DollarSign className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">{deal.brand_name}</h4>
                                                    <p className="text-sm text-muted-foreground">{deal.title} • ${deal.amount?.toLocaleString() ?? 0}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => openReview(deal)}>Review Contract</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="compliance" className="space-y-6">
                        <Card className="bg-[#141420] border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-accent-green" />
                                    Compliance & Active Deals
                                </CardTitle>
                                <CardDescription>Monitor your NCAA compliance status and manage past/active contracts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {pastDeals.length === 0 ? (
                                        <p className="text-muted-foreground text-sm text-center py-8">No active or completed deals yet.</p>
                                    ) : (
                                        pastDeals.map(deal => (
                                            <div key={deal.id} className="bg-black/30 border border-border p-5 rounded-xl space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                                            <span className="font-bold text-primary">{deal.brand_name?.slice(0, 2).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-white">{deal.brand_name}</h4>
                                                            <p className="text-sm text-accent-green font-medium">{deal.status === 'completed' ? 'Completed' : 'Active'} - ${deal.amount?.toLocaleString() ?? 0}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-1 bg-green-500/10">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {deal.status === 'completed' ? 'Fulfilled' : 'In Progress'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground border-t border-white/5 pt-4">{deal.description}</p>
                                            </div>
                                        ))
                                    )}

                                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-4">
                                        <FileCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm text-primary">NCAA & Institutional Compliance Current</h4>
                                            <p className="text-xs text-muted-foreground">
                                                All required disclosures for past and active deals have been successfully submitted to your institution's compliance office.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <ContractReviewDialog
                    open={reviewDialogOpen}
                    onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) loadDeals(); }}
                    deal={selectedDeal}
                />
            </main>
        </div>
    );
}
