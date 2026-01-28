import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { getPublicKey, finalizeEvent } from 'nostr-tools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { GuestView } from '@/components/GuestView';
import { OwnerView } from '@/components/OwnerView';
import { OwnerAuthDialog } from '@/components/OwnerAuthDialog';
import type { SupportList, TodoItem } from '@/lib/types';
import {
  decodeNsec,
  LIST_KIND,
  LIST_D_TAG,
  parseListContent,
  createListContent,
  generateItemId,
  encryptItemData,
  decryptItemData,
} from '@/lib/supportListUtils';
import { Shield, Users } from 'lucide-react';

const ListView = () => {
  const { guestNsec } = useParams<{ guestNsec: string }>();
  const [searchParams] = useSearchParams();
  const ownerNsecParam = searchParams.get('owner');

  const { nostr } = useNostr();
  const [isOwner, setIsOwner] = useState(false);
  const [ownerNsec, setOwnerNsec] = useState<string | null>(ownerNsecParam);
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [list, setList] = useState<SupportList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSeoMeta({
    title: list ? `${list.title} - Support List` : 'Support List',
    description: 'Collaborative todo list where friends can help by claiming tasks.',
  });

  // Determine guest pubkey
  const guestPrivateKey = guestNsec ? decodeNsec(guestNsec) : null;
  const guestPubkey = guestPrivateKey ? getPublicKey(guestPrivateKey) : null;

  const ownerPrivateKey = ownerNsec ? decodeNsec(ownerNsec) : null;
  const ownerPubkey = ownerPrivateKey ? getPublicKey(ownerPrivateKey) : null;

  useEffect(() => {
    if (ownerNsecParam) {
      setOwnerNsec(ownerNsecParam);
      setIsOwner(true);
    }
  }, [ownerNsecParam]);

  // Load the list from Nostr
  useEffect(() => {
    if (!guestPubkey) return;

    const loadList = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query for list events that reference this guest pubkey
        const events = await nostr.query([
          {
            kinds: [LIST_KIND],
            '#p': [guestPubkey],
            '#d': [LIST_D_TAG],
            limit: 20,
          },
        ]);

        if (events.length === 0) {
          setError('No list found. The owner may not have created the list yet.');
          setLoading(false);
          return;
        }

        // Sort events by created_at
        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
        
        // Separate owner and guest events
        const ownerEvents = sortedEvents.filter(e => {
          const parsed = parseListContent(e.content, e.pubkey);
          return parsed && e.pubkey === parsed.ownerPubkey;
        });
        const guestEvents = sortedEvents.filter(e => {
          const parsed = parseListContent(e.content, e.pubkey);
          return parsed && e.pubkey !== parsed.ownerPubkey;
        });

        // Get most recent from each
        const latestOwnerEvent = ownerEvents[0];
        const latestGuestEvent = guestEvents[0];

        if (!latestOwnerEvent) {
          setError('No list found. The owner may not have created the list yet.');
          setLoading(false);
          return;
        }

        // Parse owner's list (source of truth for structure)
        const ownerList = parseListContent(latestOwnerEvent.content, latestOwnerEvent.pubkey);
        if (!ownerList) {
          setError('Failed to parse list data.');
          setLoading(false);
          return;
        }

        // Merge by looking at all events and taking most recent non-empty values
        // Start with owner's structure (items and order from latest owner event)
        let mergedItems = ownerList.items.map(ownerItem => ({ ...ownerItem }));
        
        // Decrypt all events' items first
        const allDecryptedEvents = sortedEvents.map(event => {
          const eventList = parseListContent(event.content, latestOwnerEvent.pubkey);
          if (!eventList) return null;
          
          const decryptedItems = guestPrivateKey && eventList.ownerPubkey
            ? eventList.items.map(item => decryptItemData(item, guestPrivateKey, eventList.ownerPubkey))
            : eventList.items;
          
          return { timestamp: event.created_at, items: decryptedItems };
        }).filter(e => e !== null);
        
        // For each item, collect the most recent non-empty value for status, note, claimedBy
        mergedItems = mergedItems.map(ownerItem => {
          let bestStatus = ownerItem.status;
          let bestNote = ownerItem.note;
          let bestClaimedBy = ownerItem.claimedBy;
          
          // Look through all events from newest to oldest
          for (const { items } of allDecryptedEvents) {
            const eventItem = items.find(ei => ei.id === ownerItem.id);
            if (eventItem) {
              // Take first non-empty value found (most recent)
              if (!bestNote && eventItem.note) bestNote = eventItem.note;
              if (!bestClaimedBy && eventItem.claimedBy) bestClaimedBy = eventItem.claimedBy;
              if (eventItem.status && eventItem.status !== 'pending') bestStatus = eventItem.status;
            }
          }
          
          return {
            ...ownerItem,
            status: bestStatus,
            note: bestNote,
            claimedBy: bestClaimedBy,
          };
        });

        // Decrypt items if we have the necessary keys
        if (guestPrivateKey && ownerList.ownerPubkey) {
          const decryptedItems = mergedItems.map(item => 
            decryptItemData(item, guestPrivateKey, ownerList.ownerPubkey)
          );
          setList({ ...ownerList, items: decryptedItems });
        } else {
          setList({ ...ownerList, items: mergedItems });
        }
      } catch (err) {
        console.error('Failed to load list:', err);
        setError('Failed to load list. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [guestPubkey, nostr]);

  const handleOwnerAuth = (nsec: string) => {
    try {
      decodeNsec(nsec); // Validate nsec
      const privKey = decodeNsec(nsec);
      const pubkey = getPublicKey(privKey);
      
      if (list && pubkey === list.ownerPubkey) {
        setOwnerNsec(nsec);
        setIsOwner(true);
        setShowOwnerAuth(false);
      } else {
        throw new Error('Invalid owner key');
      }
    } catch (err) {
      throw new Error('Invalid owner key. Please check and try again.');
    }
  };

  const saveList = async (updatedList: SupportList, useGuestKey = false) => {
    const privateKey = useGuestKey ? guestPrivateKey : ownerPrivateKey;
    if (!privateKey || !guestPubkey || !updatedList.ownerPubkey) return;

    try {
      // Encrypt items before saving
      // Determine the recipient pubkey (the other party)
      const senderPubkey = getPublicKey(privateKey);
      const recipientPubkey = senderPubkey === updatedList.ownerPubkey 
        ? updatedList.guestPubkey 
        : updatedList.ownerPubkey;
      
      // Track which items get encrypted for state update
      const encryptedForStorage: TodoItem[] = [];
      const decryptedForState: TodoItem[] = [];
      
      updatedList.items.forEach(item => {
        const encrypted = encryptItemData(item, privateKey, recipientPubkey);
        
        encryptedForStorage.push(encrypted);
        
        // Keep decrypted version with proper encrypted flag for state
        decryptedForState.push({
          ...item,
          encrypted: encrypted.encrypted, // Use the encrypted flag from the encrypted version
        });
      });

      // Build p tags - include both owner and guest if we know both
      const pTags: string[][] = [['p', guestPubkey]];
      if (updatedList.ownerPubkey && updatedList.ownerPubkey !== guestPubkey) {
        pTags.push(['p', updatedList.ownerPubkey]);
      }

      const listToSave = { ...updatedList, items: encryptedForStorage };

      const event = finalizeEvent(
        {
          kind: LIST_KIND,
          content: createListContent(listToSave),
          tags: [
            ['d', LIST_D_TAG],
            ...pTags,
          ],
          created_at: Math.floor(Date.now() / 1000),
        },
        privateKey
      );

      await nostr.event(event);
      
      // Update state with decrypted items but proper encrypted flags
      setList({ ...updatedList, items: decryptedForState });
    } catch (err) {
      console.error('Failed to save list:', err);
      throw new Error('Failed to save list. Please try again.');
    }
  };

  const handleAddItem = async (title: string) => {
    if (!list) return;

    const newItem: TodoItem = {
      id: generateItemId(),
      title,
      status: 'pending',
      order: list.items.length,
    };

    const updatedList = {
      ...list,
      items: [...list.items, newItem],
      updatedAt: Date.now(),
    };

    await saveList(updatedList);
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<TodoItem>) => {
    if (!list) return;

    const updatedList = {
      ...list,
      items: list.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      updatedAt: Date.now(),
    };

    // Guests use guest key, owner uses owner key
    await saveList(updatedList, !isOwner);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!list) return;

    const updatedList = {
      ...list,
      items: list.items.filter(item => item.id !== itemId),
      updatedAt: Date.now(),
    };

    await saveList(updatedList);
  };

  const handleReorderItems = async (items: TodoItem[]) => {
    if (!list) return;

    const updatedList = {
      ...list,
      items,
      updatedAt: Date.now(),
    };

    await saveList(updatedList);
  };

  if (!guestNsec) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>Invalid list link. Please check the URL.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error || 'Failed to load list'}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isOwner ? (
              <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {list.title}
            </h1>
          </div>
          
          {!isOwner && (
            <Button
              onClick={() => setShowOwnerAuth(true)}
              variant="outline"
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Enter Owner View
            </Button>
          )}
        </div>

        {isOwner ? (
          <OwnerView
            list={list}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onReorderItems={handleReorderItems}
          />
        ) : (
          <GuestView
            list={list}
            onUpdateItem={handleUpdateItem}
          />
        )}

        <OwnerAuthDialog
          open={showOwnerAuth}
          onOpenChange={setShowOwnerAuth}
          onAuth={handleOwnerAuth}
        />
      </div>
    </div>
  );
};

export default ListView;