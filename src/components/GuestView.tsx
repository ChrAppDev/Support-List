import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { SupportList, TodoItem } from '@/lib/types';
import { sortItems } from '@/lib/supportListUtils';
import { CheckCircle2, Circle, User, MessageSquare, Lock, LockOpen } from 'lucide-react';

interface GuestViewProps {
  list: SupportList;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => Promise<void>;
}

export function GuestView({ list, onUpdateItem }: GuestViewProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [claimedByName, setClaimedByName] = useState('');
  const [updating, setUpdating] = useState(false);

  const sortedItems = sortItems(list.items);
  const pendingItems = sortedItems.filter(i => i.status === 'pending');
  const claimedItems = sortedItems.filter(i => i.status === 'claimed');
  const completeItems = sortedItems.filter(i => i.status === 'complete');

  const handleStatusChange = async (item: TodoItem, newStatus: TodoItem['status']) => {
    setUpdating(true);
    try {
      await onUpdateItem(item.id, { 
        status: newStatus,
        claimedBy: newStatus === 'claimed' ? (claimedByName || undefined) : item.claimedBy,
      });
      setClaimedByName('');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenNote = (item: TodoItem, editMode = false) => {
    if (editMode) {
      setEditingNote(item.id);
      setNoteText(item.note || '');
    } else {
      setViewingNote(item.id);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;

    setUpdating(true);
    try {
      await onUpdateItem(editingNote, { note: noteText.trim() || undefined });
      setEditingNote(null);
      setNoteText('');
    } finally {
      setUpdating(false);
    }
  };

  const renderItem = (item: TodoItem) => {
    return (
      <div
        key={item.id}
        className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      >
        <div className="pt-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-base font-medium ${
                item.status === 'complete' 
                  ? 'line-through text-gray-500 dark:text-gray-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.title}
              </p>
              
              {item.claimedBy && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  <span>{item.claimedBy}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.encrypted ? (
                <Lock className="h-4 w-4 text-green-600 dark:text-green-400" title="Encrypted" />
              ) : (
                <LockOpen className="h-4 w-4 text-yellow-600 dark:text-yellow-400" title="Not Encrypted" />
              )}
              {item.status === 'pending' && (
                <Badge variant="secondary">Available</Badge>
              )}
              {item.status === 'claimed' && (
                <Badge variant="default" className="bg-blue-600">Claimed</Badge>
              )}
              {item.status === 'complete' && (
                <Badge variant="default" className="bg-green-600">Complete</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {item.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(item, 'claimed')}
                  disabled={updating}
                  className="text-xs"
                >
                  Claim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(item, 'complete')}
                  disabled={updating}
                  className="text-xs"
                >
                  Complete
                </Button>
              </>
            )}
            
            {item.status === 'claimed' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(item, 'pending')}
                  disabled={updating}
                  className="text-xs"
                >
                  Unclaim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(item, 'complete')}
                  disabled={updating}
                  className="text-xs"
                >
                  Complete
                </Button>
              </>
            )}
            
            {item.status === 'complete' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(item, 'pending')}
                disabled={updating}
                className="text-xs"
              >
                Reopen
              </Button>
            )}

            <Button
              size="sm"
              variant={item.note ? "outline" : "ghost"}
              onClick={() => handleOpenNote(item, false)}
              disabled={updating}
              className="text-xs gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {item.note ? 'View Note' : 'Note'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-sm">
          <strong>Privacy:</strong> Tasks and notes are automatically encrypted, indicated with a <Lock className="h-3 w-3 inline text-green-600 dark:text-green-400" />. 
          Only people with the list link can read them.
        </AlertDescription>
      </Alert>

      {pendingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Circle className="h-5 w-5 text-gray-400" />
              Available Tasks ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {claimedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <User className="h-5 w-5" />
              Claimed Tasks ({claimedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {claimedItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {completeItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Completed Tasks ({completeItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completeItems.map(renderItem)}
          </CardContent>
        </Card>
      )}

      {list.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No tasks yet. The list owner will add tasks soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Note Dialog */}
      <Dialog open={viewingNote !== null} onOpenChange={(open) => !open && setViewingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(() => {
              const item = list.items.find(i => i.id === viewingNote);
              if (!item) return null;
              
              return (
                <>
                  {item.claimedBy && (
                    <div className="space-y-2">
                      <Label>Claimed By</Label>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.claimedBy}</p>
                    </div>
                  )}
                  {item.note && (
                    <div className="space-y-2">
                      <Label>Note</Label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.note}</p>
                    </div>
                  )}
                  {!item.note && !item.claimedBy && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No note has been added yet.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingNote(null)}>
              Close
            </Button>
            <Button onClick={() => {
              const item = list.items.find(i => i.id === viewingNote);
              if (item) {
                setViewingNote(null);
                handleOpenNote(item, true);
              }
            }}>
              Edit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={editingNote !== null} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="claimed-by">Your Name (optional)</Label>
              <Input
                id="claimed-by"
                placeholder="e.g., John"
                value={claimedByName}
                onChange={(e) => setClaimedByName(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add your name so others know who's helping
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Add any comments or updates..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={updating}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}