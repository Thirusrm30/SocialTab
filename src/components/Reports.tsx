import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useNavigate } from 'react-router-dom';
import { getAllUserExpenses, getUserGroups } from '@/services/firestore';
import { exportReportCSV, exportReportPDF } from '@/lib/exportUtils';
import type { Expense, Group } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Calendar,
    TrendingUp,
    FileSpreadsheet,
    FileText,
    Loader2,
    BarChart3,
    PieChart as PieChartIcon,
    DollarSign,
    Receipt,
    Users,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';

interface ExpenseWithGroup extends Expense {
    groupName: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
    food: '#f97316', transport: '#3b82f6', housing: '#a855f7', shopping: '#ec4899',
    utilities: '#eab308', entertainment: '#ef4444', health: '#22c55e', education: '#6366f1',
    work: '#6b7280', fitness: '#06b6d4', other: '#64748b',
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export function Reports() {
    const { currentUser } = useAuth();
    const { formatDate } = usePreferences();
    const navigate = useNavigate();

    const [expenses, setExpenses] = useState<ExpenseWithGroup[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    // Weekly filter state
    const [weekOffset, setWeekOffset] = useState(0);

    // Monthly filter state
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    useEffect(() => {
        if (currentUser) loadData();
    }, [currentUser]);

    async function loadData() {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [expResult, userGroups] = await Promise.all([
                getAllUserExpenses(currentUser.uid),
                getUserGroups(currentUser.uid),
            ]);
            setExpenses(expResult.expenses);
            setGroups(userGroups);
        } catch (err) {
            console.error('Error loading report data:', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }

    // ─── Weekly calculations ──────────────────────────────────────────────
    const weekRange = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { start: monday, end: sunday };
    }, [weekOffset]);

    const weeklyExpenses = useMemo(() => {
        return expenses.filter((e) => {
            const d = new Date(e.createdAt);
            return d >= weekRange.start && d <= weekRange.end;
        });
    }, [expenses, weekRange]);


    const weekLabel = `${formatDate(weekRange.start)} – ${formatDate(weekRange.end)}`;

    // ─── Monthly calculations ─────────────────────────────────────────────
    const monthlyExpenses = useMemo(() => {
        return expenses.filter((e) => {
            const d = new Date(e.createdAt);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [expenses, selectedMonth, selectedYear]);


    const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

    // ─── Shared analytics helpers ─────────────────────────────────────────
    function getCategoryData(exps: ExpenseWithGroup[]) {
        const map = new Map<string, number>();
        exps.forEach((e) => {
            const cat = e.category || 'other';
            map.set(cat, (map.get(cat) || 0) + e.amount);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value,
                fill: CATEGORY_COLORS[name] || '#94a3b8',
            }))
            .sort((a, b) => b.value - a.value);
    }

    function getGroupData(exps: ExpenseWithGroup[]) {
        const map = new Map<string, { name: string; amount: number }>();
        exps.forEach((e) => {
            const existing = map.get(e.groupId) || { name: e.groupName, amount: 0 };
            map.set(e.groupId, { name: e.groupName, amount: existing.amount + e.amount });
        });
        return Array.from(map.values())
            .map((g) => ({ name: g.name, amount: g.amount, fill: '#2E8B8B' }))
            .sort((a, b) => b.amount - a.amount);
    }

    function getMemberContribData(exps: ExpenseWithGroup[]) {
        const map = new Map<string, { name: string; amount: number }>();
        exps.forEach((e) => {
            const existing = map.get(e.paidBy) || { name: e.paidByName, amount: 0 };
            map.set(e.paidBy, { name: e.paidByName, amount: existing.amount + e.amount });
        });
        return Array.from(map.values())
            .map((m) => ({ name: m.name.split(' ')[0], amount: m.amount, fill: '#1F3A5F' }))
            .sort((a, b) => b.amount - a.amount);
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    // ─── Export handlers ──────────────────────────────────────────────────
    function handleWeeklyExport(type: 'csv' | 'pdf') {
        const reportData = {
            title: 'Weekly Report',
            dateRange: weekLabel,
            expenses: weeklyExpenses,
            groups,
        };
        const opts = { userName: currentUser?.displayName || 'User', formatDate };
        if (type === 'csv') {
            exportReportCSV(reportData, opts);
        } else {
            exportReportPDF(reportData, opts);
        }
        toast.success(`Weekly report ${type.toUpperCase()} exported!`);
    }

    function handleMonthlyExport(type: 'csv' | 'pdf') {
        const reportData = {
            title: `Monthly Report - ${monthLabel}`,
            dateRange: monthLabel,
            expenses: monthlyExpenses,
            groups,
        };
        const opts = { userName: currentUser?.displayName || 'User', formatDate };
        if (type === 'csv') {
            exportReportCSV(reportData, opts);
        } else {
            exportReportPDF(reportData, opts);
        }
        toast.success(`Monthly report ${type.toUpperCase()} exported!`);
    }

    // ─── Available years for selector ─────────────────────────────────────
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        expenses.forEach((e) => years.add(new Date(e.createdAt).getFullYear()));
        years.add(now.getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [expenses]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center app-bg">
                <Loader2 className="w-8 h-8 animate-spin text-[#2E8B8B]" />
            </div>
        );
    }

    // ─── Report Section Component ─────────────────────────────────────────
    function ReportSection({
        dateRange,
        filteredExpenses,
        onExport,
        children,
    }: {
        dateRange: string;
        filteredExpenses: ExpenseWithGroup[];
        onExport: (type: 'csv' | 'pdf') => void;
        children?: React.ReactNode;
    }) {
        const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
        const catData = getCategoryData(filteredExpenses);
        const groupData = getGroupData(filteredExpenses);
        const memberData = getMemberContribData(filteredExpenses);

        return (
            <div className="space-y-4">
                {/* Date filter controls */}
                {children}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="st-card">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: '#2E8B8B15' }}>
                                <DollarSign className="w-5 h-5 text-[#2E8B8B]" />
                            </div>
                            <p className="text-[10px] text-[#9DAEC5] font-bold uppercase">Total Spent</p>
                            <p className="text-xl font-bold text-[#2E8B8B]">{formatCurrency(total)}</p>
                        </CardContent>
                    </Card>
                    <Card className="st-card">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: '#1F3A5F10' }}>
                                <Receipt className="w-5 h-5 text-[#1F3A5F]" />
                            </div>
                            <p className="text-[10px] text-[#9DAEC5] font-bold uppercase">Expenses</p>
                            <p className="text-xl font-bold text-[#1F3A5F]">{filteredExpenses.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="st-card">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: '#1F3A5F10' }}>
                                <Users className="w-5 h-5 text-[#1F3A5F]" />
                            </div>
                            <p className="text-[10px] text-[#9DAEC5] font-bold uppercase">Groups</p>
                            <p className="text-xl font-bold text-[#1F3A5F]">{new Set(filteredExpenses.map((e) => e.groupId)).size}</p>
                        </CardContent>
                    </Card>
                </div>

                {filteredExpenses.length === 0 ? (
                    <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                        <CardContent className="py-12 text-center">
                            <BarChart3 className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                            <p className="text-[#1F3A5F] font-medium">No expenses in this period</p>
                            <p className="text-sm text-[#6B7F99]">{dateRange}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Charts Row */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Category Pie */}
                            <Card className="st-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-[#1F3A5F] flex items-center gap-2">
                                        <PieChartIcon className="w-4 h-4 text-[#2E8B8B]" />
                                        By Category
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    {catData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={catData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false}>
                                                    {catData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: '1px solid #E3EAF4', boxShadow: '0 2px 12px rgba(31,58,95,0.08)' }} />
                                                <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-[#9DAEC5] italic text-center pt-20">No data</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Group Bar */}
                            <Card className="st-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-[#1F3A5F] flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-[#2E8B8B]" />
                                        By Group
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    {groupData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={groupData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E3EAF4" />
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#1F3A5F', fontSize: 11 }} axisLine={false} />
                                                <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: '1px solid #E3EAF4' }} />
                                                <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={24}>
                                                    {groupData.map((_, i) => (
                                                        <Cell key={i} fill="#2E8B8B" />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-[#9DAEC5] italic text-center pt-20">No data</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Member Contributions */}
                        {memberData.length > 0 && (
                            <Card className="st-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-[#1F3A5F] flex items-center gap-2">
                                        <Users className="w-4 h-4 text-[#2E8B8B]" />
                                        Member Contributions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {memberData.map((m, i) => {
                                            const pct = total > 0 ? (m.amount / total) * 100 : 0;
                                            return (
                                                <div key={i} className="flex items-center gap-2 sm:gap-3">
                                                    <span className="text-sm font-medium text-[#1F3A5F] w-16 sm:w-20 truncate">{m.name}</span>
                                                    <div className="flex-1 h-2.5 bg-[#E3EAF4] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2E8B8B, #3aacac)' }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-[#2E8B8B] w-20 sm:w-24 text-right truncate">{formatCurrency(m.amount)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Expense List */}
                        <Card className="st-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-[#1F3A5F]">Expenses ({filteredExpenses.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {filteredExpenses.map((exp) => (
                                        <div key={exp.id} className="flex items-center gap-2 justify-between py-2 px-3 bg-[#F7F9FB] rounded-lg border border-[#E3EAF4]">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#2B2B2B] truncate">{exp.description}</p>
                                                <p className="text-xs text-[#9DAEC5] truncate">{formatDate(exp.createdAt)} · {exp.groupName}</p>
                                            </div>
                                            <div className="ml-1 sm:ml-3 text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-[#1F3A5F] truncate max-w-[80px] sm:max-w-none">{formatCurrency(exp.amount)}</p>
                                                <p className="text-[10px] text-[#9DAEC5] truncate max-w-[80px] sm:max-w-none">{exp.paidByName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Export Row */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                className="flex-1 rounded-xl font-semibold shadow-soft h-11"
                                style={{ background: 'linear-gradient(135deg, #2E8B8B 0%, #3aacac 100%)' }}
                                onClick={() => onExport('csv')}
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                            <Button
                                className="flex-1 rounded-xl font-semibold shadow-soft h-11"
                                style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                                onClick={() => onExport('pdf')}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Export PDF
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen app-bg pb-10">
            {/* Header */}
            <header className="header-band sticky top-0 z-10 shadow-card">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                        className="text-white/80 hover:bg-white/10 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Reports
                        </h1>
                        <p className="text-xs text-white/70">Weekly & monthly expense reports</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                <Tabs defaultValue="weekly" className="w-full">
                    <TabsList
                        className="grid w-full grid-cols-2 mb-6 p-1 rounded-xl border border-[#E3EAF4] shadow-soft"
                        style={{ background: '#F0F4FB' }}
                    >
                        <TabsTrigger
                            value="weekly"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] font-medium transition-all"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Weekly Report
                        </TabsTrigger>
                        <TabsTrigger
                            value="monthly"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] font-medium transition-all"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Monthly Report
                        </TabsTrigger>
                    </TabsList>

                    {/* Weekly Tab */}
                    <TabsContent value="weekly" className="space-y-4">
                        <ReportSection
                            dateRange={weekLabel}
                            filteredExpenses={weeklyExpenses}
                            onExport={handleWeeklyExport}
                        >
                            {/* Week Navigation */}
                            <Card className="st-card">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setWeekOffset((p) => p - 1)}
                                            className="text-[#1F3A5F] hover:bg-[#1F3A5F]/5 rounded-xl"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </Button>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-[#1F3A5F]">{weekLabel}</p>
                                            <p className="text-xs text-[#9DAEC5]">
                                                {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ${weekOffset < 0 ? 'ago' : 'ahead'}`}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setWeekOffset((p) => p + 1)}
                                            disabled={weekOffset >= 0}
                                            className="text-[#1F3A5F] hover:bg-[#1F3A5F]/5 rounded-xl disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    {weekOffset !== 0 && (
                                        <div className="text-center mt-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => setWeekOffset(0)}
                                                className="text-xs text-[#2E8B8B] font-semibold h-auto p-0"
                                            >
                                                Jump to current week
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </ReportSection>
                    </TabsContent>

                    {/* Monthly Tab */}
                    <TabsContent value="monthly" className="space-y-4">
                        <ReportSection
                            dateRange={monthLabel}
                            filteredExpenses={monthlyExpenses}
                            onExport={handleMonthlyExport}
                        >
                            {/* Month/Year Selectors */}
                            <Card className="st-card">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-[#9DAEC5] uppercase tracking-wider mb-1 block">Month</label>
                                            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                                                <SelectTrigger className="rounded-xl border-[#D3DFEE]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {MONTHS.map((m, i) => (
                                                        <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-[#9DAEC5] uppercase tracking-wider mb-1 block">Year</label>
                                            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                                <SelectTrigger className="rounded-xl border-[#D3DFEE]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableYears.map((y) => (
                                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {(selectedMonth !== now.getMonth() || selectedYear !== now.getFullYear()) && (
                                        <div className="text-center mt-3">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
                                                className="text-xs text-[#2E8B8B] font-semibold h-auto p-0"
                                            >
                                                Jump to current month
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </ReportSection>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
