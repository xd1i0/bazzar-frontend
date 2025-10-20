export interface Comment {
  id: string;           // UUID
  creatorId: string;    // Firebase UUID
  message: string;
  commenterMail: string;
  commenterName: string;
  createdAt: string;    // ISO 8601 timestamp
}

export interface AcceptanceRequest {
  userId: string;       // Firebase UUID of requester
  userName: string;     // Display name of requester (First Name + Last Name)
  requestedAt: string;  // ISO 8601 timestamp
}

export interface AcceptedUser {
  userId: string;       // Firebase UUID of accepted user
  userName: string;     // Display name of accepted user
  acceptedAt: string;   // ISO 8601 timestamp
}

export interface BazzarItem {
  id: string;
  creatorId: string;
  creatorMail: string;
  title: string;
  description: string;
  tags: string[];
  text: string;
  payPalMail: string;
  images: string[];
  comments: Comment[];
  created_at: string;
  // Acceptance & Termination (backend field names)
  acceptanceList: AcceptanceRequest[];      // Users who clicked "Nehm ich"
  acceptedUser: AcceptedUser | {};          // User accepted by owner (empty object {} if none)
  isTerminated: boolean;                     // Post is closed/completed
  // UI-only properties
  isFavorite?: boolean;
  image?: string; // First image for display
  tagObjects?: { name: string; color: string }[]; // Transformed tags for display
  itemType?: 'post' | 'meme';
}

export interface CreateCommentData {
  creatorId: string;
  message: string;
  commenterMail: string;
  commenterName: string;
}
