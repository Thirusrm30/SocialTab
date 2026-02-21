import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getUserGroups, getPublicGroups, createGroup, searchGroups, getRecentActivities, deleteActivity, setUserBudget, getUserBudget, getUserTotalExpenses } from '@/services/firestore';
import type { Group, Activity } from '@/types';
import {
  Plus,
  Search,
  Users,
  Lock,
  Globe,
  LogOut,
  Wallet,
  ArrowRight,
  Loader2,
  Activity as ActivityIcon,
  Receipt,
  UserPlus,
  ArrowRightLeft,
  Trash2,
  DollarSign,
  Target,
  AlertTriangle,
  FileText,
  UserCircle,
} from 'lucide-react';

export function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Search State
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searching, setSearching] = useState(false);

  // Budget State
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budget, setBudget] = useState<number | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Derived budget values
  const remaining = budget !== null ? Math.max(budget - totalSpent, 0) : 0;
  const percentageUsed = budget !== null && budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Predictive Budget Logic
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const projectedSpending = totalSpent > 0 ? (totalSpent / daysPassed) * daysInMonth : 0;
  const isProjectedOverBudget = budget !== null && projectedSpending > budget;
  const projectedPercentage = budget !== null && budget > 0 ? (projectedSpending / budget) * 100 : 0;

  function getBudgetBarColor(pct: number): string {
    if (pct > 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-teal-500';
  }

  useEffect(() => {
    loadGroups();
  }, [currentUser]);

  // Load budget whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      loadBudgetData();
    }
  }, [currentUser]);

  async function loadGroups() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [userGroups, allPublic] = await Promise.all([
        getUserGroups(currentUser.uid),
        getPublicGroups(),
      ]);
      setMyGroups(userGroups);
      setPublicGroups(allPublic.filter((g) => !userGroups.some((ug) => ug.id === g.id)));

      // Load activities for user's groups
      if (userGroups.length > 0) {
        loadActivities(userGroups.map(g => g.id));
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
      // Recalculate total expenses whenever groups reload/finish loading
      loadBudgetData();
    }
  }

  async function loadBudgetData() {
    if (!currentUser) return;
    try {
      const [userBudget, userTotal] = await Promise.all([
        getUserBudget(currentUser.uid),
        getUserTotalExpenses(currentUser.uid),
      ]);
      setBudget(userBudget);
      setTotalSpent(Number(userTotal));
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  }

  async function handleSetBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !budgetInput) return;

    const amount = Number(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number for the budget.");
      return;
    }

    setBudgetLoading(true);
    try {
      await setUserBudget(currentUser.uid, amount);
      setBudget(amount);
      setBudgetDialogOpen(false);
      setBudgetInput('');
      // Refresh spending after setting budget
      loadBudgetData();
    } catch (error) {
      console.error('Error setting budget:', error);
    } finally {
      setBudgetLoading(false);
    }
  }

  async function loadActivities(groupIds: string[]) {
    try {
      const activities = await getRecentActivities(groupIds);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    try {
      await deleteActivity(activityId);
      // Refresh activities
      const userGroupIds = myGroups.map(g => g.id);
      if (userGroupIds.length > 0) {
        loadActivities(userGroupIds);
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  }

  function groupActivitiesByDate(activities: Activity[]) {
    const groups: { [key: string]: Activity[] } = {
      'Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Older': []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    activities.forEach(activity => {
      const date = activity.createdAt;
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);

      if (compareDate.getTime() === today.getTime()) {
        groups['Today'].push(activity);
      } else if (compareDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(activity);
      } else if (compareDate > lastWeek) {
        groups['Last 7 Days'].push(activity);
      } else {
        groups['Older'].push(activity);
      }
    });

    return groups;
  }

  const groupedActivities = groupActivitiesByDate(recentActivity);
  const activitySections = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setCreating(true);
    try {
      await createGroup(
        newGroupName,
        newGroupDescription,
        isPublic,
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || 'Anonymous'
      );
      setCreateDialogOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchGroups(globalSearchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching groups:', error);
    } finally {
      setSearching(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  const filteredMyGroups = myGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicGroups = publicGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E8B8B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="header-band sticky top-0 z-10 shadow-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2E8B8B 0%, #3aacac 100%)' }}
            >
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">SocialTab</h1>
              <p className="text-xs text-white/70 font-medium">{currentUser?.displayName || currentUser?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/export')} className="text-white/80 hover:bg-white/10 hover:text-white transition-all" title="Export Reports">
              <FileText className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white/80 hover:bg-white/10 hover:text-white transition-all" title="Profile">
              <UserCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/80 hover:bg-white/10 hover:text-white transition-all" title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search and Create */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5] group-focus-within:text-[#2E8B8B] transition-colors" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-[#D3DFEE] bg-white h-11 focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 transition-all shadow-soft"
            />
          </div>

          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-xl font-semibold shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:translate-y-0 h-11 border-0"
                style={{ background: 'linear-gradient(135deg, #2E8B8B 0%, #3aacac 100%)', color: '#fff' }}
              >
                <Search className="w-4 h-4 mr-2" />
                Find
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#1F3A5F]">Find a group</DialogTitle>
                <DialogDescription>
                  Search for any public or private group by name or description.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                <form onSubmit={handleGlobalSearch} className="flex gap-2">
                  <Input
                    placeholder="Search query..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    className="flex-1 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                  />
                  <Button
                    type="submit"
                    disabled={searching}
                    className="rounded-xl"
                    style={{ background: '#1F3A5F' }}
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                  {searchResults.length === 0 && !searching && globalSearchQuery && (
                    <div className="text-center py-8 text-[#9DAEC5]">
                      No groups found matching "{globalSearchQuery}"
                    </div>
                  )}
                  {searchResults.map((group) => {
                    const isMember = group.members.some(m => m.uid === currentUser?.uid);
                    const isPending = group.joinRequests?.some(r => r.uid === currentUser?.uid);

                    return (
                      <Card
                        key={group.id}
                        className="cursor-pointer st-card hover:shadow-hover transition-all border border-[#E3EAF4]"
                        onClick={() => {
                          setSearchDialogOpen(false);
                          navigate(`/group/${group.id}`);
                        }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[#1F3A5F]">{group.name}</h3>
                              {group.isPublic ? (
                                <Globe className="w-3 h-3 text-[#9DAEC5]" />
                              ) : (
                                <Lock className="w-3 h-3 text-[#9DAEC5]" />
                              )}
                            </div>
                            <p className="text-sm text-[#6B7F99] line-clamp-1">{group.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs bg-[#1F3A5F]/8 text-[#1F3A5F]">
                                <Users className="w-3 h-3 mr-1" />
                                {group.members.length} members
                              </Badge>
                              {isMember && <Badge variant="outline" className="text-xs border-[#2E8B8B] text-[#2E8B8B]">Member</Badge>}
                              {isPending && <Badge variant="outline" className="text-xs border-[#F4B860] text-[#c47e1f]">Pending</Badge>}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#9DAEC5]" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-xl font-semibold shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:translate-y-0 h-11 border-0"
                style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)', color: '#fff' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#1F3A5F]">Create new group</DialogTitle>
                <DialogDescription>
                  Create a group to start tracking shared expenses
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-[#2B2B2B]">Group name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Weekend Trip"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-[#2B2B2B]">Description</Label>
                    <Input
                      id="description"
                      placeholder="What's this group for?"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      className="rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="public" className="text-sm font-medium text-[#2B2B2B]">Public group</Label>
                      <p className="text-sm text-[#6B7F99]">
                        Anyone can find and request to join
                      </p>
                    </div>
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="w-full rounded-xl font-semibold h-11"
                    style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                  >
                    {creating ? 'Creating...' : 'Create group'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Card */}
        <Card className="mb-6 st-card overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 border-b border-[#E3EAF4]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#2E8B8B15' }}>
                    <DollarSign className="w-5 h-5 text-[#2E8B8B]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1F3A5F]">Monthly budget</h3>
                    <p className="text-xs text-[#9DAEC5] font-medium uppercase tracking-wider">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs font-semibold hover:bg-[#2E8B8B]/5 hover:text-[#2E8B8B] border-[#D3DFEE] rounded-lg transition-colors">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      {budget ? 'Update' : 'Set budget'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-[#1F3A5F]">Monthly budget</DialogTitle>
                      <DialogDescription>
                        Set your spending limit for this month to stay on track with your financial goals.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSetBudget} className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="budget-input" className="text-sm font-semibold text-[#2B2B2B]">Budget amount ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9DAEC5]" />
                          <Input
                            id="budget-input"
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="500.00"
                            className="pl-9 h-11 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B]"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={budgetLoading}
                        className="w-full h-11 font-bold rounded-xl shadow-soft transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                      >
                        {budgetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {budget ? 'Update budget' : 'Save budget'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {budget !== null ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="stat-tile">
                      <p className="text-[10px] text-[#9DAEC5] font-bold uppercase mb-0.5">Budget</p>
                      <p className="text-sm font-bold text-[#1F3A5F]">${budget.toFixed(2)}</p>
                    </div>
                    <div className="stat-tile">
                      <p className="text-[10px] text-[#9DAEC5] font-bold uppercase mb-0.5">Spent</p>
                      <p className="text-sm font-bold text-[#2E8B8B]">${totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="stat-tile">
                      <p className="text-[10px] text-[#9DAEC5] font-bold uppercase mb-0.5">Remaining</p>
                      <p className={`text-sm font-bold ${remaining < 50 ? 'text-red-600' : 'text-[#2E8B8B]'}`}>${remaining.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Prediction Badge */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${isProjectedOverBudget ? 'bg-amber-50 border-amber-100' : 'bg-[#2E8B8B]/5 border-[#2E8B8B]/10'}`}>
                    <div className="flex items-center gap-2">
                      <ActivityIcon className={`w-4 h-4 ${isProjectedOverBudget ? 'text-amber-500' : 'text-[#2E8B8B]'}`} />
                      <div>
                        <p className={`text-xs font-bold ${isProjectedOverBudget ? 'text-amber-700' : 'text-[#1F3A5F]'}`}>
                          {isProjectedOverBudget ? 'Projected overdraft' : 'On track'}
                        </p>
                        <p className={`text-[10px] ${isProjectedOverBudget ? 'text-amber-600' : 'text-[#6B7F99]'}`}>
                          Est. end of month: <span className="font-bold">${projectedSpending.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    {isProjectedOverBudget && (
                      <Badge variant="outline" className="bg-white text-amber-600 border-amber-200 text-[10px]">
                        {projectedPercentage.toFixed(0)}% of budget
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="h-2.5 bg-[#E3EAF4] rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${getBudgetBarColor(percentageUsed)}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-[#6B7F99]">
                        {percentageUsed.toFixed(0)}% utilized
                      </p>
                      {percentageUsed > 90 && (
                        <div className="flex items-center gap-1.5 animate-pulse text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5 font-black" />
                          <span className="text-[10px] font-black uppercase">Critical limit reached!</span>
                        </div>
                      )}
                      {percentageUsed >= 70 && percentageUsed <= 90 && (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Approaching threshold</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center bg-[#F7F9FB] rounded-xl border border-dashed border-[#D3DFEE]">
                  <Target className="w-8 h-8 text-[#D3DFEE] mb-2" />
                  <p className="text-sm text-[#6B7F99] font-medium">No budget configured for this month</p>
                  <Button variant="link" size="sm" onClick={() => setBudgetDialogOpen(true)} className="text-[#2E8B8B] font-bold mt-1 h-auto p-0">
                    Get started now →
                  </Button>
                </div>
              )}
            </div>

            {budget !== null && percentageUsed > 90 && (
              <div className="bg-red-50 p-3 flex items-start gap-3 border-t border-red-100">
                <div className="w-7 h-7 bg-red-100 rounded-full flex-shrink-0 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-900 mb-0.5">Budget alert</p>
                  <p className="text-[11px] text-red-700 leading-tight">
                    You've consumed over 90% of your budget. Consider reviewing your upcoming expenses.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Tabs */}
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList
            className="grid w-full grid-cols-3 mb-4 p-1 rounded-xl border border-[#E3EAF4] shadow-soft"
            style={{ background: '#F0F4FB' }}
          >
            <TabsTrigger
              value="my-groups"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] font-medium text-sm transition-all"
            >
              My groups ({filteredMyGroups.length})
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] font-medium text-sm transition-all"
            >
              Discover ({filteredPublicGroups.length})
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] font-medium text-sm transition-all"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups" className="space-y-3">
            {filteredMyGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#1F3A5F] font-medium mb-2">No groups yet</p>
                  <p className="text-sm text-[#6B7F99]">
                    Create a group or join one to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMyGroups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer st-card group"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1F3A5F]">{group.name}</h3>
                          {group.isPublic ? (
                            <Globe className="w-3 h-3 text-[#9DAEC5]" />
                          ) : (
                            <Lock className="w-3 h-3 text-[#9DAEC5]" />
                          )}
                        </div>
                        <p className="text-sm text-[#6B7F99] line-clamp-1">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="text-xs bg-[#1F3A5F]/8 text-[#1F3A5F]">
                            <Users className="w-3 h-3 mr-1" />
                            {group.members.length}
                          </Badge>
                          <span className="text-xs text-[#9DAEC5]">
                            {group.members.some((m) => m.uid === currentUser?.uid && m.role === 'admin')
                              ? 'Admin'
                              : 'Member'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#D3DFEE] group-hover:text-[#2E8B8B] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-3">
            {filteredPublicGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#6B7F99]">No public groups found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPublicGroups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer st-card group"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1F3A5F]">{group.name}</h3>
                          <Globe className="w-3 h-3 text-[#9DAEC5]" />
                        </div>
                        <p className="text-sm text-[#6B7F99] line-clamp-1">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="text-xs bg-[#1F3A5F]/8 text-[#1F3A5F]">
                            <Users className="w-3 h-3 mr-1" />
                            {group.members.length}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#D3DFEE] group-hover:text-[#2E8B8B] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {recentActivity.length === 0 ? (
              <Card className="border-dashed border-2 border-[#D3DFEE] bg-white shadow-none rounded-2xl">
                <CardContent className="py-12 text-center">
                  <ActivityIcon className="w-12 h-12 text-[#D3DFEE] mx-auto mb-4" />
                  <p className="text-[#1F3A5F] font-medium mb-2">No recent activity</p>
                  <p className="text-sm text-[#6B7F99]">
                    Join groups and start tracking expenses to see updates here
                  </p>
                </CardContent>
              </Card>
            ) : (
              activitySections.map(section => {
                const activities = groupedActivities[section];
                if (activities.length === 0) return null;

                return (
                  <div key={section} className="space-y-2">
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-[#9DAEC5] sticky top-0 bg-[#F7F9FB]/90 py-1.5 px-2 rounded-lg backdrop-blur-sm z-10">
                      {section}
                    </h3>
                    {activities.map((activity) => (
                      <Card key={activity.id} className="st-card hover:translate-x-1 transition-transform">
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex-shrink-0">
                              {activity.type === 'expense' && (
                                <div className="activity-icon bg-amber-50">
                                  <Receipt className="w-4 h-4 text-[#F4B860]" />
                                </div>
                              )}
                              {activity.type === 'settlement' && (
                                <div className="activity-icon bg-[#2E8B8B]/10">
                                  <ArrowRightLeft className="w-4 h-4 text-[#2E8B8B]" />
                                </div>
                              )}
                              {activity.type === 'member_joined' && (
                                <div className="activity-icon bg-[#1F3A5F]/8">
                                  <UserPlus className="w-4 h-4 text-[#1F3A5F]" />
                                </div>
                              )}
                              {activity.type === 'group_created' && (
                                <div className="activity-icon bg-[#2E8B8B]/10">
                                  <Plus className="w-4 h-4 text-[#2E8B8B]" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-baseline gap-2 overflow-hidden">
                              <span className="font-semibold text-sm text-[#1F3A5F] whitespace-nowrap">{activity.userName}</span>
                              <span className="text-sm text-[#6B7F99] truncate">{activity.description}</span>
                              {activity.type !== 'group_created' && (
                                <span className="text-xs text-[#9DAEC5] whitespace-nowrap hidden sm:inline">in {activity.groupName}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-[#9DAEC5] whitespace-nowrap">
                              {activity.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-[#D3DFEE] hover:text-red-500"
                              onClick={() => handleDeleteActivity(activity.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main >
    </div >
  );
}
