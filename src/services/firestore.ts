import { db, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, query, where, serverTimestamp } from '@/lib/firebase';
import type { Group, GroupMember, JoinRequest, Expense, Settlement, Activity } from '@/types';

// Helper to parse dates
function parseDate(value: any): Date {
  if (!value) return new Date();
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

// Activity Services
export async function logActivity(
  groupId: string,
  groupName: string,
  type: 'expense' | 'settlement' | 'member_joined' | 'group_created',
  description: string,
  userId: string,
  userName: string
): Promise<void> {
  await addDoc(collection(db, 'activities'), {
    groupId,
    groupName,
    type,
    description,
    userId,
    userName,
    createdAt: serverTimestamp(),
  });
}

export async function getRecentActivities(groupIds: string[]): Promise<Activity[]> {
  if (groupIds.length === 0) return [];

  // Note: 'in' operator supports up to 10/30 values. Check documentation or chunk if necessary.
  // For simplicity in this demo, we'll fetch all and filter. 
  // A production app would likely paginate or use specific queries per group.

  const snapshot = await getDocs(collection(db, 'activities'));
  const activities: Activity[] = [];

  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    if (groupIds.includes(data.groupId)) {
      activities.push({
        id: docItem.id,
        groupId: data.groupId,
        groupName: data.groupName,
        type: data.type,
        description: data.description,
        userId: data.userId,
        userName: data.userName,
        createdAt: parseDate(data.createdAt),
      });
    }
  });

  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return activities;
}
// Helper for deleteActivity
export async function deleteActivity(activityId: string): Promise<void> {
  await deleteDoc(doc(db, 'activities', activityId));
}

// User Budget Services
export async function updateMonthlyBudget(userId: string, amount: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { monthlyBudget: amount }, { merge: true });
}

export async function getUserBudget(userId: string): Promise<number | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().monthlyBudget ?? null;
  }
  return null;
}

export async function getUserMonthlyExpenses(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const q = query(collection(db, 'expenses'), where('splitAmong', 'array-contains', userId));
  const snapshot = await getDocs(q);

  let total = 0;

  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    const createdAt = parseDate(data.createdAt);

    if (createdAt >= startOfMonth) {
      const splitCount = data.splitAmong ? data.splitAmong.length : 1;
      if (splitCount > 0) {
        total += data.amount / splitCount;
      }
    }
  });

  return total;
}

// Group Services
export async function deleteGroup(groupId: string): Promise<void> {
  // Delete all sub-resources first

  // 1. Delete expenses
  const expensesSnapshot = await getDocs(collection(db, 'expenses'));
  const deleteExpensesPromises: Promise<void>[] = [];
  expensesSnapshot.docs.forEach((docItem: any) => {
    if (docItem.data().groupId === groupId) {
      deleteExpensesPromises.push(deleteDoc(doc(db, 'expenses', docItem.id)));
    }
  });
  await Promise.all(deleteExpensesPromises);

  // 2. Delete settlements
  const settlementsSnapshot = await getDocs(collection(db, 'settlements'));
  const deleteSettlementsPromises: Promise<void>[] = [];
  settlementsSnapshot.docs.forEach((docItem: any) => {
    if (docItem.data().groupId === groupId) {
      deleteSettlementsPromises.push(deleteDoc(doc(db, 'settlements', docItem.id)));
    }
  });
  await Promise.all(deleteSettlementsPromises);

  // 3. Delete activities
  const activitiesSnapshot = await getDocs(collection(db, 'activities'));
  const deleteActivitiesPromises: Promise<void>[] = [];
  activitiesSnapshot.docs.forEach((docItem: any) => {
    if (docItem.data().groupId === groupId) {
      deleteActivitiesPromises.push(deleteDoc(doc(db, 'activities', docItem.id)));
    }
  });
  await Promise.all(deleteActivitiesPromises);

  // 4. Delete the group itself
  await deleteDoc(doc(db, 'groups', groupId));
}
// Group Services
export async function createGroup(
  name: string,
  description: string,
  isPublic: boolean,
  userId: string,
  userEmail: string,
  userName: string
): Promise<string> {
  const groupData = {
    name,
    description,
    isPublic,
    createdBy: userId,
    createdAt: serverTimestamp(),
    members: [
      {
        uid: userId,
        email: userEmail,
        displayName: userName,
        role: 'admin' as const,
        joinedAt: new Date().toISOString(),
      },
    ],
    joinRequests: [],
  };

  const result = await addDoc(collection(db, 'groups'), groupData);

  await logActivity(
    result.id,
    name,
    'group_created',
    `created group "${name}"`,
    userId,
    userName
  );

  return result.id;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const snapshot = await getDocs(collection(db, 'groups'));
  const groups: Group[] = [];

  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    const members = data.members || [];
    const isMember = members.some((m: GroupMember) => m.uid === userId);

    if (isMember) {
      groups.push({
        id: docItem.id,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
        createdAt: parseDate(data.createdAt),
        members: data.members.map((m: any) => ({
          ...m,
          joinedAt: parseDate(m.joinedAt),
        })),
        joinRequests: (data.joinRequests || []).map((r: any) => ({
          ...r,
          requestedAt: parseDate(r.requestedAt),
        })),
      });
    }
  });

  return groups;
}

export async function getPublicGroups(): Promise<Group[]> {
  const snapshot = await getDocs(collection(db, 'groups'));

  const groups: Group[] = [];
  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    if (data.isPublic) {
      groups.push({
        id: docItem.id,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
        createdAt: parseDate(data.createdAt),
        members: data.members.map((m: any) => ({
          ...m,
          joinedAt: parseDate(m.joinedAt),
        })),
        joinRequests: (data.joinRequests || []).map((r: any) => ({
          ...r,
          requestedAt: parseDate(r.requestedAt),
        })),
      });
    }
  });

  return groups;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const docRef = doc(db, 'groups', groupId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    description: data.description,
    isPublic: data.isPublic,
    createdBy: data.createdBy,
    createdAt: parseDate(data.createdAt),
    members: data.members.map((m: any) => ({
      ...m,
      joinedAt: parseDate(m.joinedAt),
    })),
    joinRequests: (data.joinRequests || []).map((r: any) => ({
      ...r,
      requestedAt: parseDate(r.requestedAt),
    })),
  };
}

export async function searchGroups(queryText: string): Promise<Group[]> {
  // Note: Firestore doesn't support native full-text search.
  // We'll fetch all groups and filter client-side for this implementation.
  // For production with large datasets, consider using Algolia or ElasticSearch.

  const snapshot = await getDocs(collection(db, 'groups'));
  const groups: Group[] = [];
  const lowerQuery = queryText.toLowerCase();

  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    // Match name or description
    if (
      data.name.toLowerCase().includes(lowerQuery) ||
      (data.description && data.description.toLowerCase().includes(lowerQuery))
    ) {
      groups.push({
        id: docItem.id,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        createdBy: data.createdBy,
        createdAt: parseDate(data.createdAt),
        members: data.members.map((m: any) => ({
          ...m,
          joinedAt: parseDate(m.joinedAt),
        })),
        joinRequests: (data.joinRequests || []).map((r: any) => ({
          ...r,
          requestedAt: parseDate(r.requestedAt),
        })),
      });
    }
  });

  return groups;
}

export async function sendJoinRequest(
  groupId: string,
  userId: string,
  userEmail: string,
  userName: string
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists) return;

  const data = groupSnap.data();
  const request = {
    uid: userId,
    email: userEmail,
    displayName: userName,
    requestedAt: new Date().toISOString(),
  };

  const currentRequests = data.joinRequests || [];
  // Check if request already exists
  if (currentRequests.some((r: any) => r.uid === userId)) {
    return;
  }

  await updateDoc(groupRef, {
    joinRequests: [...currentRequests, request],
  });
}

export async function approveJoinRequest(
  groupId: string,
  request: JoinRequest
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists) return;

  const data = groupSnap.data();
  const newMember = {
    uid: request.uid,
    email: request.email,
    displayName: request.displayName,
    role: 'member' as const,
    joinedAt: new Date().toISOString(),
  };

  const currentMembers = data.members || [];
  const currentRequests = data.joinRequests || [];

  await updateDoc(groupRef, {
    members: [...currentMembers, newMember],
    joinRequests: currentRequests.filter((r: any) => r.uid !== request.uid),
  });

  await logActivity(
    groupId,
    data.name,
    'member_joined',
    `joined the group`,
    request.uid,
    request.displayName
  );
}

export async function rejectJoinRequest(
  groupId: string,
  request: JoinRequest
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists) return;

  const data = groupSnap.data();
  const currentRequests = data.joinRequests || [];

  await updateDoc(groupRef, {
    joinRequests: currentRequests.filter((r: any) => r.uid !== request.uid),
  });
}

export async function leaveGroup(groupId: string, member: GroupMember): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists) return;

  const data = groupSnap.data();
  const currentMembers = data.members || [];

  await updateDoc(groupRef, {
    members: currentMembers.filter((m: any) => m.uid !== member.uid),
  });
}

// Expense Services
export async function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  paidByName: string,
  splitAmong: string[],
  createdBy: string,
  category?: string
): Promise<string> {
  const expenseData = {
    groupId,
    description,
    amount,
    paidBy,
    paidByName,
    splitAmong,
    category,
    createdAt: serverTimestamp(),
    createdBy,
  };

  const result = await addDoc(collection(db, 'expenses'), expenseData);

  // Need to fetch group name
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const groupName = groupSnap.exists() ? groupSnap.data().name : 'Unknown Group';

  await logActivity(
    groupId,
    groupName,
    'expense',
    `added expense: ${description}`,
    createdBy,
    paidByName
  );

  return result.id;
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const snapshot = await getDocs(collection(db, 'expenses'));
  const expenses: Expense[] = [];

  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    if (data.groupId === groupId) {
      expenses.push({
        id: docItem.id,
        groupId: data.groupId,
        description: data.description,
        amount: data.amount,
        paidBy: data.paidBy,
        paidByName: data.paidByName,
        splitAmong: data.splitAmong,
        category: data.category,
        createdAt: parseDate(data.createdAt),
        createdBy: data.createdBy,
      });
    }
  });

  // Sort by createdAt desc
  expenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return expenses;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', expenseId));
}

// Settlement Services
export async function addSettlement(
  groupId: string,
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  amount: number
): Promise<string> {
  const settlementData = {
    groupId,
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    amount,
    settledAt: serverTimestamp(),
  };

  const result = await addDoc(collection(db, 'settlements'), settlementData);

  // Need to fetch group name
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const groupName = groupSnap.exists() ? groupSnap.data().name : 'Unknown Group';

  await logActivity(
    groupId,
    groupName,
    'settlement',
    `paid ${toUserName}`,
    fromUserId,
    fromUserName
  );

  return result.id;
}

export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  const snapshot = await getDocs(collection(db, 'settlements'));
  const settlements: Settlement[] = [];

  snapshot.docs.forEach((docItem: any) => {
    const data = docItem.data();
    if (data.groupId === groupId) {
      settlements.push({
        id: docItem.id,
        groupId: data.groupId,
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        toUserId: data.toUserId,
        toUserName: data.toUserName,
        amount: data.amount,
        settledAt: parseDate(data.settledAt),
      });
    }
  });

  // Sort by settledAt desc
  settlements.sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime());

  return settlements;
}

// Calculate balances
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  members: GroupMember[]
): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize balances
  members.forEach((member) => {
    balances.set(member.uid, 0);
  });

  // Process expenses
  expenses.forEach((expense) => {
    const paidBy = expense.paidBy;
    const amount = expense.amount;
    const splitCount = expense.splitAmong.length;
    const splitAmount = amount / splitCount;

    // Add full amount to payer
    balances.set(paidBy, (balances.get(paidBy) || 0) + amount);

    // Subtract split amount from each member
    expense.splitAmong.forEach((userId) => {
      balances.set(userId, (balances.get(userId) || 0) - splitAmount);
    });
  });

  // Process settlements
  settlements.forEach((settlement) => {
    balances.set(
      settlement.fromUserId,
      (balances.get(settlement.fromUserId) || 0) + settlement.amount
    );
    balances.set(
      settlement.toUserId,
      (balances.get(settlement.toUserId) || 0) - settlement.amount
    );
  });

  return balances;
}

export function getSimplifiedDebts(
  balances: Map<string, number>
): { from: string; to: string; amount: number }[] {
  const debts: { from: string; to: string; amount: number }[] = [];

  const creditors: { uid: string; amount: number }[] = [];
  const debtors: { uid: string; amount: number }[] = [];

  balances.forEach((amount, uid) => {
    if (amount > 0.01) {
      creditors.push({ uid, amount });
    } else if (amount < -0.01) {
      debtors.push({ uid, amount: -amount });
    }
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      debts.push({
        from: debtor.uid,
        to: creditor.uid,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return debts;
}
