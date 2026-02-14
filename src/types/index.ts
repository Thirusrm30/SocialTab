export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  members: GroupMember[];
  joinRequests?: JoinRequest[];
}

export interface GroupMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface JoinRequest {
  uid: string;
  email: string;
  displayName: string;
  requestedAt: Date;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splitAmong: string[];
  category?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  settledAt: Date;
}

export interface Balance {
  userId: string;
  userName: string;
  amount: number;
}

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number;
}

export interface Activity {
  id: string;
  groupId: string;
  groupName: string;
  type: 'expense' | 'settlement' | 'member_joined' | 'group_created';
  description: string;
  userId: string;
  userName: string;
  createdAt: Date;
}
