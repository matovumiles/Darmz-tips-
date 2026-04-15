import { Timestamp } from 'firebase/firestore';

export type Sport = 'Football' | 'Basketball' | 'Tennis' | 'Cricket';

export interface Tip {
  id: string;
  sport: Sport;
  league: string;
  home: string;
  away: string;
  date: Timestamp;
  tip: string;
  odds: number;
  confidence: number; // 68-92%
  reasoning?: string;
  matchTime?: string;
  expected_value: number;
  image_url: string;
  isHot?: boolean;
  status: 'active' | 'won' | 'lost';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  favorites: string[];
  role: 'admin' | 'user';
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string; // 'all' for all users
  message: string;
  createdAt: Timestamp;
  read: boolean;
}
