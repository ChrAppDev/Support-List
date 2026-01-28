import { nip19, generateSecretKey, getPublicKey, finalizeEvent, type UnsignedEvent, nip44 } from 'nostr-tools';
import type { SupportList, TodoItem } from './types';

export const LIST_KIND = 30078; // Application-specific data
export const LIST_D_TAG = 'support-list';

// Prefix to identify encrypted data
const ENCRYPTED_PREFIX = 'ENC:';

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

/**
 * Encrypt item data using NIP-44
 * This function takes a decrypted item and returns it in encrypted form for storage
 */
export function encryptItemData(item: TodoItem, senderPrivKey: Uint8Array, recipientPubkey: string): TodoItem {
  // If title already has ENC: prefix, it's already in encrypted storage form
  if (item.title.startsWith(ENCRYPTED_PREFIX)) {
    return item;
  }

  try {
    // Create payload with sensitive data
    const payload = {
      title: item.title,
      note: item.note,
      claimedBy: item.claimedBy,
    };
    
    // Encrypt using NIP-44
    const conversationKey = nip44.v2.utils.getConversationKey(
      Buffer.from(senderPrivKey).toString('hex'),
      recipientPubkey
    );
    const encrypted = nip44.v2.encrypt(JSON.stringify(payload), conversationKey);
    
    // Return item with encrypted title and encrypted flag
    return {
      id: item.id,
      title: ENCRYPTED_PREFIX + encrypted,
      status: item.status,
      order: item.order,
      encrypted: true,
      // Note: note and claimedBy are encrypted inside the title, so we don't include them here
    };
  } catch (error) {
    console.error('Failed to encrypt item:', error);
    // Return original item without encryption if it fails
    return {
      ...item,
      encrypted: false,
    };
  }
}

/**
 * Decrypt item data using NIP-44
 * This function takes an encrypted item from storage and returns it in decrypted form for display
 */
export function decryptItemData(item: TodoItem, privateKey: Uint8Array, senderPubkey: string): TodoItem {
  // If title doesn't have ENC: prefix, it's an old unencrypted item
  if (!item.title.startsWith(ENCRYPTED_PREFIX)) {
    return {
      ...item,
      encrypted: false, // Explicitly mark as unencrypted
    };
  }
  
  try {
    // Extract encrypted data
    const encryptedData = item.title.substring(ENCRYPTED_PREFIX.length);
    
    // Decrypt using NIP-44
    const conversationKey = nip44.v2.utils.getConversationKey(
      Buffer.from(privateKey).toString('hex'),
      senderPubkey
    );
    const decrypted = nip44.v2.decrypt(encryptedData, conversationKey);
    const payload = JSON.parse(decrypted);
    
    // Return item with decrypted data, preserve encrypted flag
    return {
      ...item,
      title: payload.title,
      note: payload.note,
      claimedBy: payload.claimedBy,
      encrypted: true, // Keep the encrypted flag
    };
  } catch (error) {
    console.error('Failed to decrypt item:', error);
    // Return item with "[Encrypted]" placeholder if decryption fails
    return {
      ...item,
      title: '[Encrypted - Unable to decrypt]',
    };
  }
}
