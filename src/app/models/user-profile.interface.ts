export interface UserProfile {
  uid: string;
  email: string;
  vorname: string;
  name: string;
  zenturie: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
}
