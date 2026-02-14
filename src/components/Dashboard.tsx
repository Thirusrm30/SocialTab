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

  function getBudgetBarColor(pct: number): string {
    if (pct > 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-orange-500';
    return 'bg-green-500';
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
      // Note: activity.createdAt is already a Date object from parseDate in firestore.ts
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">SocialTab</h1>
              <p className="text-xs text-white/80">{currentUser?.displayName || currentUser?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/export')} className="text-white hover:bg-white/20 hover:text-white" title="Export Reports">
              <FileText className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/20 hover:text-white" title="Profile">
              <UserCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20 hover:text-white" title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search and Create */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/90 border-0 focus-visible:ring-2 focus-visible:ring-white/50"
            />
          </div>


          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white/90 text-purple-600 hover:bg-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95">
                <Search className="w-4 h-4 mr-2" />
                Find Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Find a Group</DialogTitle>
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
                    className="flex-1"
                  />
                  <Button type="submit" disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </Button>
                </form>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                  {searchResults.length === 0 && !searching && globalSearchQuery && (
                    <div className="text-center py-8 text-gray-500">
                      No groups found matching "{globalSearchQuery}"
                    </div>
                  )}
                  {searchResults.map((group) => {
                    const isMember = group.members.some(m => m.uid === currentUser?.uid);
                    const isPending = group.joinRequests?.some(r => r.uid === currentUser?.uid);

                    return (
                      <Card
                        key={group.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors border shadow-sm"
                        onClick={() => {
                          setSearchDialogOpen(false);
                          navigate(`/group/${group.id}`);
                        }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{group.name}</h3>
                              {group.isPublic ? (
                                <Globe className="w-3 h-3 text-gray-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-1">{group.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {group.members.length} members
                              </Badge>
                              {isMember && <Badge variant="outline" className="text-xs border-green-500 text-green-600">Member</Badge>}
                              {isPending && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Pending</Badge>}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
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
              <Button className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg transition-all hover:scale-105 active:scale-95">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a group to start tracking shared expenses
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Weekend Trip"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="What's this group for?"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="public">Public Group</Label>
                      <p className="text-sm text-gray-500">
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
                  <Button type="submit" disabled={creating} className="w-full">
                    {creating ? 'Creating...' : 'Create Group'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Card */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shadow-inner">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Monthly Budget</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs font-semibold hover:bg-purple-50 hover:text-purple-600 border-purple-100 transition-colors">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      {budget ? 'Update' : 'Set Budget'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Monthly Budget</DialogTitle>
                      <DialogDescription>
                        Set your spending limit for this month to stay on track with your financial goals.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSetBudget} className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="budget-input" className="text-sm font-semibold text-gray-700">Budget Amount ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="budget-input"
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="500.00"
                            className="pl-9 h-11"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={budgetLoading} className="w-full h-11 bg-purple-600 hover:bg-purple-700 font-bold shadow-md transition-all active:scale-95">
                        {budgetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {budget ? 'Update Budget' : 'Save Budget'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {budget !== null ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Budget</p>
                      <p className="text-sm font-bold text-gray-900">${budget.toFixed(2)}</p>
                    </div>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Spent</p>
                      <p className="text-sm font-bold text-purple-600">${totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Remaining</p>
                      <p className={`text-sm font-bold ${remaining < 50 ? 'text-red-600' : 'text-green-600'}`}>${remaining.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner flex">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${getBudgetBarColor(percentageUsed)}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-500">
                        {percentageUsed.toFixed(0)}% Utilized
                      </p>
                      {percentageUsed > 90 && (
                        <div className="flex items-center gap-1.5 animate-pulse text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5 font-black" />
                          <span className="text-[10px] font-black uppercase">Critical Limit Reached!</span>
                        </div>
                      )}
                      {percentageUsed >= 70 && percentageUsed <= 90 && (
                        <div className="flex items-center gap-1.5 text-orange-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Approaching threshold</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Target className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No budget configured for this month</p>
                  <Button variant="link" size="sm" onClick={() => setBudgetDialogOpen(true)} className="text-purple-600 font-bold mt-1 h-auto p-0">
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
                  <p className="text-xs font-bold text-red-900 mb-0.5">Budget Alert</p>
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
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-white/20 p-1">
            <TabsTrigger value="my-groups" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white hover:bg-white/10">My Groups ({filteredMyGroups.length})</TabsTrigger>
            <TabsTrigger value="discover" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white hover:bg-white/10">Discover ({filteredPublicGroups.length})</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 text-white hover:bg-white/10">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups" className="space-y-3">
            {filteredMyGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">No groups yet</p>
                  <p className="text-sm text-white/70">
                    Create a group or join one to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMyGroups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/95 backdrop-blur-sm group hover:-translate-y-1"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          {group.isPublic ? (
                            <Globe className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {group.members.length}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {group.members.some((m) => m.uid === currentUser?.uid && m.role === 'admin')
                              ? 'Admin'
                              : 'Member'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-3">
            {filteredPublicGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">No public groups found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPublicGroups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/95 backdrop-blur-sm group hover:-translate-y-1"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          <Globe className="w-3 h-3 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {group.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {group.members.length}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {recentActivity.length === 0 ? (
              <Card className="border-dashed border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-none">
                <CardContent className="py-12 text-center">
                  <ActivityIcon className="w-12 h-12 text-white/50 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">No recent activity</p>
                  <p className="text-sm text-white/70">
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
                    <h3 className="text-sm font-medium text-white/80 sticky top-0 bg-gradient-to-r from-violet-500/90 to-purple-500/90 py-1 px-2 rounded backdrop-blur-sm z-10">
                      {section}
                    </h3>
                    {activities.map((activity) => (
                      <Card key={activity.id} className="bg-white/95 backdrop-blur-sm border-0 shadow-sm hover:translate-x-1 transition-transform">
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex-shrink-0">
                              {activity.type === 'expense' && <Receipt className="w-4 h-4 text-orange-500" />}
                              {activity.type === 'settlement' && <ArrowRightLeft className="w-4 h-4 text-green-500" />}
                              {activity.type === 'member_joined' && <UserPlus className="w-4 h-4 text-blue-500" />}
                              {activity.type === 'group_created' && <Plus className="w-4 h-4 text-purple-500" />}
                            </div>
                            <div className="flex items-baseline gap-2 overflow-hidden">
                              <span className="font-semibold text-sm whitespace-nowrap">{activity.userName}</span>
                              <span className="text-sm text-gray-700 truncate">{activity.description}</span>
                              {activity.type !== 'group_created' && (
                                <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">in {activity.groupName}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {activity.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
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
