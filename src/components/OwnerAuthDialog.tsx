import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface OwnerAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (nsec: string) => void;
}

export function OwnerAuthDialog({ open, onOpenChange, onAuth }: OwnerAuthDialogProps) {
  const [nsec, setNsec] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      onAuth(nsec);
      setNsec('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNsec('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Enter Owner View
          </DialogTitle>
          <DialogDescription>
            Enter your owner key (nsec) to access the owner view where you can add, remove, and reorder tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nsec">Owner Key (nsec)</Label>
            <Input
              id="nsec"
              type="password"
              placeholder="nsec1..."
              value={nsec}
              onChange={(e) => {
                setNsec(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <AlertDescription className="text-sm">
              <strong>Security Note:</strong> Only enter your owner key on devices you trust. 
              This key gives full control over the list.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!nsec.trim() || loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {loading ? 'Verifying...' : 'Enter Owner View'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}