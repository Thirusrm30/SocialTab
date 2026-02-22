import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFriends, getFriendRequests, searchUsers, sendFriendRequest, resolveFriendRequest } from '@/services/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Users, Check, X, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function Friends() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser]);

    async function loadData() {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [f, r] = await Promise.all([
                getFriends(currentUser.uid),
                getFriendRequests(currentUser.uid)
            ]);
            setFriends(f);
            setRequests(r);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!searchQuery.trim() || !currentUser) return;
        setSearching(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results.filter(u => u.uid !== currentUser.uid && !friends.some(f => f.id === u.uid || f.uid === u.uid)));
        } catch (err) {
            toast.error('Failed to search users');
        } finally {
            setSearching(false);
        }
    }

    async function handleSendRequest(user: any) {
        if (!currentUser) return;
        try {
            await sendFriendRequest(
                currentUser.uid,
                currentUser.displayName || 'Anonymous',
                user.uid,
                user.displayName || 'Anonymous'
            );
            toast.success('Friend request sent!');
            setSearchResults(prev => prev.filter(u => u.uid !== user.uid));
        } catch (err) {
            toast.error('Failed to send request');
        }
    }

    async function handleResolveRequest(requestId: string, status: 'accepted' | 'rejected', fromUserId: string) {
        if (!currentUser) return;
        try {
            await resolveFriendRequest(requestId, status, fromUserId, currentUser.uid);
            toast.success(`Request ${status}`);
            loadData();
        } catch (err) {
            toast.error('Failed to process request');
        }
    }

    return (
        <div className="min-h-screen app-bg pb-10">
            <header className="header-band sticky top-0 z-10 shadow-card">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="text-white/80 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5" /> Friends
                    </h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                <Card className="st-card">
                    <CardHeader>
                        <CardTitle className="text-[#1F3A5F]">Find Friends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9DAEC5]" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email"
                                    className="pl-9 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                                />
                            </div>
                            <Button type="submit" disabled={searching} className="rounded-xl shadow-soft" style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}>
                                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                            </Button>
                        </form>

                        <div className="space-y-2">
                            {searchResults.map(user => (
                                <div key={user.uid} className="flex items-center justify-between p-3 rounded-xl border border-[#E3EAF4] bg-white">
                                    <div>
                                        <h4 className="font-semibold text-[#1F3A5F]">{user.displayName}</h4>
                                        <p className="text-xs text-[#6B7F99]">{user.email}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleSendRequest(user)} className="rounded-lg text-[#2E8B8B] border-[#2E8B8B] hover:bg-[#2E8B8B]/10">
                                        <UserPlus className="w-4 h-4 mr-1" /> Add
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {requests.length > 0 && (
                    <Card className="st-card border-amber-200 shadow-[0_4px_20px_-4px_rgba(244,184,96,0.3)]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[#c47e1f] flex items-center gap-2">
                                <Users className="w-5 h-5" /> Pending Requests ({requests.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {requests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                                    <div>
                                        <h4 className="font-semibold text-[#1F3A5F]">{req.fromUserName}</h4>
                                        <p className="text-xs text-[#6B7F99]">Wants to connect with you</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={() => handleResolveRequest(req.id, 'rejected', req.fromUserId)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" className="h-8 w-8 bg-[#2E8B8B] hover:bg-[#2E8B8B]/90 text-white" onClick={() => handleResolveRequest(req.id, 'accepted', req.fromUserId)}>
                                            <Check className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card className="st-card">
                    <CardHeader>
                        <CardTitle className="text-[#1F3A5F]">My Friends ({friends.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-[#2E8B8B]" /></div>
                        ) : friends.length === 0 ? (
                            <div className="text-center py-8 text-[#9DAEC5]">
                                You haven't added any friends yet.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {friends.map(friend => (
                                    <div key={friend.uid || friend.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E3EAF4] bg-[#F7F9FB]">
                                        <div className="w-10 h-10 rounded-full bg-[#1F3A5F]/10 flex items-center justify-center">
                                            <span className="font-bold text-[#1F3A5F]">{friend.displayName?.charAt(0) || 'U'}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[#1F3A5F]">{friend.displayName}</h4>
                                            <p className="text-xs text-[#6B7F99]">{friend.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
