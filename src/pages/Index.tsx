import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicKey, finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateKeypair, decodeNsec, LIST_KIND, LIST_D_TAG } from '@/lib/supportListUtils';
import { Copy, Check, ListTodo, Users } from 'lucide-react';

const Index = () => {
  useSeoMeta({
    title: 'Support List - Create Your Collaborative Todo List',
    description: 'Create a shareable todo list where friends can help by claiming tasks.',
  });

  const navigate = useNavigate();
  const { nostr } = useNostr();
  const [listTitle, setListTitle] = useState('');
  const [ownerNsec, setOwnerNsec] = useState('');
  const [guestNsec, setGuestNsec] = useState('');
  const [ownerLink, setOwnerLink] = useState('');
  const [guestLink, setGuestLink] = useState('');
  const [copiedOwner, setCopiedOwner] = useState(false);
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [step, setStep] = useState<'create' | 'generated'>('create');
  const [publishing, setPublishing] = useState(false);

  const handleCreateList = () => {
    if (!listTitle.trim()) return;

    // Generate keypairs
    const owner = generateKeypair();
    const guest = generateKeypair();

    setOwnerNsec(owner.nsec);
    setGuestNsec(guest.nsec);
    setOwnerLink(`${window.location.origin}/list/${guest.nsec}?owner=${encodeURIComponent(owner.nsec)}`);
    setGuestLink(`${window.location.origin}/list/${guest.nsec}`);
    setStep('generated');
  };

  const copyToClipboard = async (text: string, type: 'owner' | 'guest') => {
    await navigator.clipboard.writeText(text);
    if (type === 'owner') {
      setCopiedOwner(true);
      setTimeout(() => setCopiedOwner(false), 2000);
    } else {
      setCopiedGuest(true);
      setTimeout(() => setCopiedGuest(false), 2000);
    }
  };

  const handleGoToOwnerView = async () => {
    setPublishing(true);
    try {
      // Decode keys to get pubkeys
      const ownerPrivateKey = decodeNsec(ownerNsec);
      const ownerPubkey = getPublicKey(ownerPrivateKey);
      const guestPrivateKey = decodeNsec(guestNsec);
      const guestPubkey = getPublicKey(guestPrivateKey);

      // Create initial empty list event
      const listContent = JSON.stringify({
        title: listTitle,
        items: [],
        ownerPubkey,
        guestPubkey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const event = finalizeEvent(
        {
          kind: LIST_KIND,
          content: listContent,
          tags: [
            ['d', LIST_D_TAG],
            ['p', ownerPubkey],
            ['p', guestPubkey],
          ],
          created_at: Math.floor(Date.now() / 1000),
        },
        ownerPrivateKey
      );

      // Publish to Nostr
      await nostr.event(event);

      // Navigate to owner view
      navigate(`/list/${guestNsec}?owner=${encodeURIComponent(ownerNsec)}`);
    } catch (error) {
      console.error('Failed to publish list:', error);
      alert('Failed to publish list. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ListTodo className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              Support List
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create collaborative todo lists that friends can help with
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {step === 'create' ? (
            <Card className="shadow-xl border-2 border-indigo-100 dark:border-indigo-900">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Create Your Support List
                </CardTitle>
                <CardDescription className="text-base">
                  Generate a private list you can share with friends to get help with tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">List Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Moving Day Checklist"
                    value={listTitle}
                    onChange={(e) => setListTitle(e.target.value)}
                    className="text-lg h-12"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                  />
                </div>

                <Alert className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
                  <AlertDescription className="text-sm">
                    <strong>How it works:</strong> You'll receive two keys - one for managing the list (owner) 
                    and a shareable link for friends to view and claim tasks (guest).
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleCreateList}
                  disabled={!listTitle.trim()}
                  className="w-full h-12 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Create List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl border-2 border-green-100 dark:border-green-900">
              <CardHeader className="space-y-2 pb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-t-lg">
                <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                  ✓ List Created Successfully!
                </CardTitle>
                <CardDescription className="text-base">
                  Save these keys securely - you'll need them to access your list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-red-600 dark:text-red-400">
                      Owner Link (Keep Private!)
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Use this link to manage your list. Anyone with this link can add, remove, and reorder tasks.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={ownerLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => copyToClipboard(ownerLink, 'owner')}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        {copiedOwner ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-blue-600 dark:text-blue-400">
                      Guest Link (Share This!)
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Share this link with friends so they can view and claim tasks
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={guestLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => copyToClipboard(guestLink, 'guest')}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        {copiedGuest ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> Save your owner link somewhere safe! If you lose it, 
                    you won't be able to manage your list. Do not share this link publicly!
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={handleGoToOwnerView}
                    disabled={publishing}
                    className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {publishing ? 'Publishing to Nostr...' : 'Go to Owner View'}
                  </Button>
                  <Button
                    onClick={() => {
                      setStep('create');
                      setListTitle('');
                    }}
                    variant="outline"
                    className="flex-1 h-12"
                    disabled={publishing}
                  >
                    Create Another List
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Vibed with{' '}
              <a
                href="https://shakespeare.diy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Shakespeare
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
