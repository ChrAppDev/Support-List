import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { SupportList, TodoItem } from '@/lib/types';
import { sortItems } from '@/lib/supportListUtils';
import { CheckCircle2, Circle, User, MessageSquare, Trash2, GripVertical, ChevronUp, ChevronDown, Plus, Lock } from 'lucide-react';

interface OwnerViewProps {
  list: SupportList;
  onAddItem: (title: string) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<TodoItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onReorderItems: (items: TodoItem[]) => Promise<void>;
}

export function OwnerView({
  list,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}: OwnerViewProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [claimedByName, setClaimedByName] = useState('');
  const [updating, setUpdating] = useState(false);

  const sortedItems = sortItems(list.items);
  const pendingItems = sortedItems.filter(i => i.status === 'pending');
  const claimedItems = sortedItems.filter(i => i.status === 'claimed');
  const completeItems = sortedItems.filter(i => i.status === 'complete');

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;

    setAdding(true);
    try {
      await onAddItem(newItemTitle.trim());
      setNewItemTitle('');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenNote = (item: TodoItem, editMode = false) => {
    if (editMode) {
      setEditingNote(item.id);
      setNoteText(item.note || '');
      setClaimedByName(item.claimedBy || '');
    } else {
      setViewingNote(item.id);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;

    setUpdating(true);
    try {
      await onUpdateItem(editingNote, { 
        note: noteText.trim() || undefined,
        claimedBy: claimedByName.trim() || undefined,
      });
      setEditingNote(null);
      setNoteText('');
      setClaimedByName('');
    } finally {
      setUpdating(false);
    }
  };

  const handleMoveUp = async (item: TodoItem, items: TodoItem[]) => {
    const currentIndex = items.findIndex(i => i.id === item.id);
    if (currentIndex <= 0) return;

    const newItems = [...items];
    [newItems[currentIndex - 1], newItems[currentIndex]] = [newItems[currentIndex], newItems[currentIndex - 1]];
    
    // Update order values
    const reorderedItems = newItems.map((item, index) => ({ ...item, order: index }));
    
    // Merge with other status items
    const allItems = [
      ...reorderedItems.filter(i => i.status === item.status),
      ...sortedItems.filter(i => i.status !== item.status),
    ];
    
    await onReorderItems(allItems);
  };

  const handleMoveDown = async (item: TodoItem, items: TodoItem[]) => {
    const currentIndex = items.findIndex(i => i.id === item.id);
    if (currentIndex >= items.length - 1) return;

    const newItems = [...items];
    [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
    
    // Update order values
    const reorderedItems = newItems.map((item, index) => ({ ...item, order: index }));
    
    // Merge with other status items
    const allItems = [
      ...reorderedItems.filter(i => i.status === item.status),
      ...sortedItems.filter(i => i.status !== item.status),
    ];
    
    await onReorderItems(allItems);
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetItemId: string, items: TodoItem[]) => {
    if (!draggedItem || draggedItem === targetItemId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = items.findIndex(i => i.id === draggedItem);
    const targetIndex = items.findIndex(i => i.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Update order values
    const reorderedItems = newItems.map((item, index) => ({ ...item, order: index }));
    
    // Get the status of the dragged item
    const status = items[draggedIndex].status;
    
    // Merge with other status items
    const allItems = [
      ...reorderedItems.filter(i => i.status === status),
      ...sortedItems.filter(i => i.status !== status),
    ];
    
    await onReorderItems(allItems);
    setDraggedItem(null);
  };

  const renderItem = (item: TodoItem, items: TodoItem[], index: number) => {
    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item.id)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(item.id, items)}
        className={`flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-move ${
          draggedItem === item.id ? 'opacity-50' : ''
        }`}
      >
        <GripVertical className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMoveUp(item, items)}
              disabled={index === 0}
              className="text-xs gap-1"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Up
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMoveDown(item, items)}
              disabled={index === items.length - 1}
              className="text-xs gap-1"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Down
            </Button>
            <Button
              size="sm"
              variant={item.note ? "outline" : "ghost"}
              onClick={() => handleOpenNote(item, false)}
              className="text-xs gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {item.note ? 'View Note' : 'Note'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDeleteItem(item.id)}
              className="text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter task title..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-1"
            />
            <Button
              onClick={handleAddItem}
              disabled={!newItemTitle.trim() || adding}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-sm">
          <strong>Privacy:</strong> Tasks and notes are automatically encrypted. 
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
            {pendingItems.map((item, index) => renderItem(item, pendingItems, index))}
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
            {claimedItems.map((item, index) => renderItem(item, claimedItems, index))}
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
            {completeItems.map((item, index) => renderItem(item, completeItems, index))}
          </CardContent>
        </Card>
      )}

      {list.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No tasks yet. Add your first task above to get started.
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
              <Label htmlFor="claimed-by-owner">Claimed By (optional)</Label>
              <Input
                id="claimed-by-owner"
                placeholder="e.g., John"
                value={claimedByName}
                onChange={(e) => setClaimedByName(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Name of person who claimed this task
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-owner">Note</Label>
              <Textarea
                id="note-owner"
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