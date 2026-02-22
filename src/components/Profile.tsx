import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences, type DateFormatOption, type LanguageOption } from '@/contexts/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile } from '@/services/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    User,
    Mail,
    Hash,
    Calendar,
    Pencil,
    Globe,
    CalendarDays,
    Star,
    Share2,
    Shield,
    Loader2,
    Check,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGE_LABELS: Record<LanguageOption, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    hi: 'हिन्दी',
};

const DATE_FORMAT_EXAMPLES: Record<DateFormatOption, string> = {
    'DD/MM/YYYY': '14/02/2026',
    'MM/DD/YYYY': '02/14/2026',
    'YYYY-MM-DD': '2026-02-14',
};

export function Profile() {
    const { currentUser } = useAuth();
    const { preferences, updatePreferences, formatDate } = usePreferences();
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [createdAt, setCreatedAt] = useState('');
    const [loading, setLoading] = useState(true);

    // Edit name dialog
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Privacy policy dialog
    const [privacyOpen, setPrivacyOpen] = useState(false);

    // Link copied state
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            if (!currentUser) return;
            setLoading(true);
            try {
                const profile = await getUserProfile(currentUser.uid);
                if (profile) {
                    setDisplayName(profile.displayName || currentUser.displayName || 'Anonymous');
                    setEmail(profile.email || currentUser.email || '');
                    setUserId(profile.userId);
                    setCreatedAt(profile.createdAt);
                } else {
                    // Initialize profile if it doesn't exist
                    const now = new Date().toISOString();
                    setDisplayName(currentUser.displayName || 'Anonymous');
                    setEmail(currentUser.email || '');
                    setUserId(currentUser.uid);
                    setCreatedAt(now);
                    await updateUserProfile(currentUser.uid, {
                        displayName: currentUser.displayName || 'Anonymous',
                        email: currentUser.email || '',
                        createdAt: now,
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                setDisplayName(currentUser.displayName || 'Anonymous');
                setEmail(currentUser.email || '');
                setUserId(currentUser.uid);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [currentUser]);

    async function handleSaveName(e: React.FormEvent) {
        e.preventDefault();
        if (!currentUser || !newDisplayName.trim()) return;
        setSavingName(true);
        try {
            await updateUserProfile(currentUser.uid, { displayName: newDisplayName.trim() });
            setDisplayName(newDisplayName.trim());
            setEditNameOpen(false);
            toast.success('Display name updated!');
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error('Failed to update display name');
        } finally {
            setSavingName(false);
        }
    }

    async function handleRateApp() {
        toast.success('Thank you for rating FairShare! ⭐', {
            description: 'Your feedback helps us improve the app.',
        });
    }

    async function handleShareApp() {
        const shareData = {
            title: 'FairShare - Expense Sharing App',
            text: 'Check out FairShare — the easiest way to split expenses with friends and groups!',
            url: window.location.origin,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // User cancelled share
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                setLinkCopied(true);
                toast.success('Link copied to clipboard!');
                setTimeout(() => setLinkCopied(false), 2000);
            } catch {
                toast.error('Could not copy link');
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center app-bg">
                <Loader2 className="w-8 h-8 animate-spin text-[#2E8B8B]" />
            </div>
        );
    }

    const accountCreatedDate = createdAt ? new Date(createdAt) : new Date();

    return (
        <div className="min-h-screen app-bg">
            {/* Header */}
            <header className="header-band sticky top-0 z-10 shadow-card">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="text-white/80 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg text-white">Profile</h1>
                        <p className="text-xs text-white/70">Manage your account & preferences</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* ── Avatar & Name ────────────────────────── */}
                <div className="flex flex-col items-center gap-3 pt-2 pb-4 animate-fade-up">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center shadow-card ring-4 ring-white"
                        style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2E8B8B 100%)' }}
                    >
                        <span className="text-3xl font-bold text-white">
                            {displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-[#1F3A5F]">{displayName}</h2>
                        <p className="text-sm text-[#6B7F99]">{email}</p>
                    </div>
                </div>

                {/* ── Account Info ────────────────────────── */}
                <Card className="st-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.05s' }}>
                    <CardContent className="p-0">
                        <div className="px-5 py-3 border-b border-[#E3EAF4]">
                            <h3 className="section-label">Account info</h3>
                        </div>

                        <div className="divide-y divide-[#F0F4FB]">
                            {/* Name Row */}
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#1F3A5F]/8 flex items-center justify-center">
                                        <User className="w-4 h-4 text-[#1F3A5F]" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#9DAEC5] font-medium">Display name</p>
                                        <p className="text-sm font-semibold text-[#2B2B2B]">{displayName}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[#2E8B8B] hover:bg-[#2E8B8B]/8 h-8 rounded-lg"
                                    onClick={() => {
                                        setNewDisplayName(displayName);
                                        setEditNameOpen(true);
                                    }}
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-1" />
                                    Edit
                                </Button>
                            </div>

                            {/* Email Row */}
                            <div className="px-5 py-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#2E8B8B]/10 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-[#2E8B8B]" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#9DAEC5] font-medium">Email</p>
                                    <p className="text-sm font-semibold text-[#2B2B2B]">{email}</p>
                                </div>
                            </div>

                            {/* User ID Row */}
                            <div className="px-5 py-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#F4B860]/15 flex items-center justify-center">
                                    <Hash className="w-4 h-4 text-[#c47e1f]" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#9DAEC5] font-medium">User ID</p>
                                    <p className="text-sm font-semibold text-[#2B2B2B] font-mono text-xs break-all">{userId}</p>
                                </div>
                            </div>

                            {/* Account Created Row */}
                            <div className="px-5 py-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#1F3A5F]/8 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-[#1F3A5F]" />
                                </div>
                                <div>
                                    <p className="text-xs text-[#9DAEC5] font-medium">Account created</p>
                                    <p className="text-sm font-semibold text-[#2B2B2B]">{formatDate(accountCreatedDate)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Preferences ────────────────────────── */}
                <Card className="st-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <CardContent className="p-0">
                        <div className="px-5 py-3 border-b border-[#E3EAF4]">
                            <h3 className="section-label">Preferences</h3>
                        </div>

                        <div className="divide-y divide-[#F0F4FB]">
                            {/* Date Format */}
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#2E8B8B]/10 flex items-center justify-center">
                                        <CalendarDays className="w-4 h-4 text-[#2E8B8B]" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#9DAEC5] font-medium">Date format</p>
                                        <p className="text-sm font-semibold text-[#2B2B2B]">
                                            {preferences.dateFormat}
                                            <span className="text-[#9DAEC5] font-normal ml-2">
                                                ({DATE_FORMAT_EXAMPLES[preferences.dateFormat]})
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <Select
                                    value={preferences.dateFormat}
                                    onValueChange={(value) => updatePreferences({ dateFormat: value as DateFormatOption })}
                                >
                                    <SelectTrigger className="w-[160px] h-9 text-sm rounded-lg border-[#D3DFEE]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Language */}
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#1F3A5F]/8 flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-[#1F3A5F]" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#9DAEC5] font-medium">Language</p>
                                        <p className="text-sm font-semibold text-[#2B2B2B]">
                                            {LANGUAGE_LABELS[preferences.language]}
                                        </p>
                                    </div>
                                </div>
                                <Select
                                    value={preferences.language}
                                    onValueChange={(value) => updatePreferences({ language: value as LanguageOption })}
                                >
                                    <SelectTrigger className="w-[160px] h-9 text-sm rounded-lg border-[#D3DFEE]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Other ────────────────────────── */}
                <Card className="st-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.15s' }}>
                    <CardContent className="p-0">
                        <div className="px-5 py-3 border-b border-[#E3EAF4]">
                            <h3 className="section-label">Other</h3>
                        </div>

                        <div className="divide-y divide-[#F0F4FB]">
                            {/* Rate App */}
                            <button
                                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[#F7F9FB] transition-colors text-left"
                                onClick={handleRateApp}
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#F4B860]/15 flex items-center justify-center">
                                    <Star className="w-4 h-4 text-[#F4B860]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#2B2B2B]">Rate app</p>
                                    <p className="text-xs text-[#9DAEC5]">Let us know what you think</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-[#D3DFEE]" />
                            </button>

                            {/* Share App */}
                            <button
                                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[#F7F9FB] transition-colors text-left"
                                onClick={handleShareApp}
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#2E8B8B]/10 flex items-center justify-center">
                                    {linkCopied ? <Check className="w-4 h-4 text-[#2E8B8B]" /> : <Share2 className="w-4 h-4 text-[#2E8B8B]" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#2B2B2B]">Share app</p>
                                    <p className="text-xs text-[#9DAEC5]">{linkCopied ? 'Link copied!' : 'Invite friends to FairShare'}</p>
                                </div>
                                <Copy className="w-4 h-4 text-[#D3DFEE]" />
                            </button>

                            {/* Privacy Policy */}
                            <button
                                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[#F7F9FB] transition-colors text-left"
                                onClick={() => setPrivacyOpen(true)}
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#1F3A5F]/8 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-[#1F3A5F]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#2B2B2B]">Privacy policy</p>
                                    <p className="text-xs text-[#9DAEC5]">How we handle your data</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-[#D3DFEE]" />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Version */}
                <div className="text-center pt-2 pb-8">
                    <p className="text-xs text-[#9DAEC5] font-medium">FairShare v1.0.0</p>
                </div>
            </main>

            {/* ── Edit Name Dialog ────────────────────────── */}
            <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-[#1F3A5F]">Edit display name</DialogTitle>
                        <DialogDescription>
                            Change how your name appears across the app.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveName}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Display name</Label>
                                <Input
                                    id="edit-name"
                                    value={newDisplayName}
                                    onChange={(e) => setNewDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditNameOpen(false)} className="rounded-lg border-[#D3DFEE]">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={savingName}
                                className="rounded-lg"
                                style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                            >
                                {savingName ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Privacy Policy Dialog ────────────────────────── */}
            <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-[#1F3A5F]">Privacy policy</DialogTitle>
                        <DialogDescription>
                            Last updated: {formatDate(new Date())}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-[#2B2B2B] leading-relaxed py-4">
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">1. Information we collect</h4>
                            <p>
                                FairShare collects your email address, display name, and expense data that you voluntarily enter.
                                We do not collect any personal data beyond what is necessary to provide the service.
                            </p>
                        </section>
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">2. How we use your information</h4>
                            <p>
                                Your information is used solely to provide expense sharing and tracking functionality.
                                We do not sell, trade, or share your personal information with third parties.
                            </p>
                        </section>
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">3. Data storage</h4>
                            <p>
                                Your data is securely stored using Firebase (Google Cloud Platform) infrastructure.
                                We implement appropriate security measures to protect your information.
                            </p>
                        </section>
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">4. Data retention</h4>
                            <p>
                                Your data is retained as long as your account is active. You may request deletion
                                of your account and associated data at any time.
                            </p>
                        </section>
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">5. Your rights</h4>
                            <p>
                                You have the right to access, modify, or delete your personal data. You can update
                                your profile information from the Profile page at any time.
                            </p>
                        </section>
                        <section>
                            <h4 className="font-bold text-[#1F3A5F] mb-1">6. Contact us</h4>
                            <p>
                                If you have any questions about this privacy policy, please contact us through the app.
                            </p>
                        </section>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setPrivacyOpen(false)}
                            className="w-full rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                        >
                            I understand
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
