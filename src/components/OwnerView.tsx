import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { SupportList, TodoItem } from '@/lib/types';
import { sortItems } from '@/lib/supportListUtils';
import { CheckCircle2, Circle, User, MessageSquare, Trash2, GripVertical, ChevronUp, ChevronDown, Plus } from 'lucide-react';

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
  onDeleteItem,
  onReorderItems,
}: OwnerViewProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

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
    const statusIcon = item.status === 'complete' ? (
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
    ) : (
      <Circle className="h-5 w-5 text-gray-400" />
    );

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
        <div className="pt-0.5">{statusIcon}</div>
        
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
              
              {item.note && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{item.note}</span>
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

          <div className="flex gap-2 mt-3">
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
    </div>
  );
}