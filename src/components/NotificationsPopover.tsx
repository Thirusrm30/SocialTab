import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/firestore';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';

export function NotificationsPopover() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadNotifications();
        }
    }, [currentUser]);

    async function loadNotifications() {
        if (!currentUser) return;
        try {
            setLoading(true);
            const data = await getUserNotifications(currentUser.uid);
            setNotifications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkAsRead(id: string) {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }

    async function handleMarkAllAsRead() {
        if (!currentUser) return;
        await markAllNotificationsAsRead(currentUser.uid);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Popover open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) loadNotifications();
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-white/80 hover:bg-white/10 hover:text-white transition-all">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 mt-2 rounded-2xl border-[#E3EAF4] shadow-hover" align="end">
                <div className="flex items-center justify-between p-4 border-b border-[#E3EAF4] bg-[#F7F9FB] rounded-t-2xl">
                    <h3 className="font-bold text-[#1F3A5F]">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-0 text-xs text-[#2E8B8B] hover:text-[#2E8B8B]/80 bg-transparent hover:bg-transparent">
                            <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto w-full p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-[#9DAEC5]" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-[#6B7F99] text-sm">
                            No recent notifications
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`p-3 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${notif.read ? 'bg-white hover:bg-[#F7F9FB]' : 'bg-[#EAF3F3] hover:bg-[#EAF3F3]/80'}`}
                                onClick={() => {
                                    if (!notif.read) handleMarkAsRead(notif.id);
                                    if (notif.link) {
                                        setOpen(false);
                                        navigate(notif.link);
                                    }
                                }}
                            >
                                {!notif.read && <div className="w-2 h-2 rounded-full bg-[#2E8B8B] mt-1.5 flex-shrink-0" />}
                                <div className={notif.read ? 'ml-2' : ''}>
                                    <p className={`text-sm ${notif.read ? 'text-[#6B7F99]' : 'text-[#1F3A5F] font-semibold'}`}>{notif.message}</p>
                                    <p className="text-[10px] text-[#9DAEC5] mt-1">{notif.createdAt.toLocaleDateString()} {notif.createdAt.toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
