export interface TodoItem {
  id: string;
  title: string;
  status: 'pending' | 'claimed' | 'complete';
  claimedBy?: string;
  note?: string;
  order: number;
  encrypted?: boolean; // True if item data is encrypted
}

export interface SupportList {
  id: string;
  title: string;
  items: TodoItem[];
  ownerPubkey: string;
  guestPubkey: string;
  createdAt: number;
  updatedAt: number;
}
