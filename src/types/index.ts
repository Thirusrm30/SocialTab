export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  friends?: string[]; // array of UIDs
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
  location?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    country?: string;
  };
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

export interface Payment {
  id: string;
  userId: string;
  paidToId: string;
  paidToName: string;
  expenseId: string;
  groupId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  timestamp: Date;
  status: string;
  expenseTitle?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'group_invite' | 'expense_added' | 'payment_done' | 'friend_invite' | 'group_created' | 'join_request';
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
