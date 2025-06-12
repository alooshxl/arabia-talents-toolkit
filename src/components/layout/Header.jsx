import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import { Key, Home } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

export default function Header() {
  const { apiKey, updateApiKey } = useAppContext(); // currentTheme and changeTheme are used by ThemeSwitcher
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveApiKey = () => {
    updateApiKey(tempApiKey);
    setIsDialogOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Arabia Talents</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Key className="mr-2 h-4 w-4" />
                {apiKey ? 'Update API Key' : 'Set API Key'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>YouTube Data API Key</DialogTitle>
                <DialogDescription>
                  Enter your YouTube Data API v3 key to use the tools. You can get one from the Google Cloud Console.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveApiKey}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

