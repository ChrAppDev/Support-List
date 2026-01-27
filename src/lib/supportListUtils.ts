import { nip19, generateSecretKey, getPublicKey, finalizeEvent, type UnsignedEvent } from 'nostr-tools';
import type { SupportList, TodoItem } from './types';

export const LIST_KIND = 30078; // Application-specific data
export const LIST_D_TAG = 'support-list';

/**
 * Generate a new keypair for either owner or guest
 */
export function generateKeypair() {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);
  const nsec = nip19.nsecEncode(privateKey);
  const npub = nip19.npubEncode(publicKey);
  
  return { privateKey, publicKey, nsec, npub };
}

/**
 * Decode an nsec to get the private key
 */
export function decodeNsec(nsec: string): Uint8Array {
  try {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec format');
    }
    return decoded.data;
  } catch (error) {
    throw new Error('Failed to decode nsec: ' + (error as Error).message);
  }
}

/**
 * Create the list event content
 */
export function createListContent(list: SupportList): string {
  return JSON.stringify({
    title: list.title,
    items: list.items,
    ownerPubkey: list.ownerPubkey,
    guestPubkey: list.guestPubkey,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  });
}

/**
 * Parse list event content
 */
export function parseListContent(content: string, fallbackOwnerPubkey: string): SupportList | null {
  try {
    const data = JSON.parse(content);
    return {
      id: LIST_D_TAG,
      title: data.title || 'Support List',
      items: data.items || [],
      ownerPubkey: data.ownerPubkey || fallbackOwnerPubkey,
      guestPubkey: data.guestPubkey,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a unique ID for a todo item
 */
export function generateItemId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Sort items by status and order
 */
export function sortItems(items: TodoItem[]): TodoItem[] {
  const pending = items.filter(i => i.status === 'pending').sort((a, b) => a.order - b.order);
  const claimed = items.filter(i => i.status === 'claimed').sort((a, b) => a.order - b.order);
  const complete = items.filter(i => i.status === 'complete').sort((a, b) => a.order - b.order);
  
  return [...pending, ...claimed, ...complete];
}
