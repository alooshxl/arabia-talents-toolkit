import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import { Key, Home } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

export default function Header() {
  const { apiKey, updateApiKey, geminiApiKey, setGeminiApiKey } = useAppContext();
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Update temp keys if context keys change (e.g. loaded from localStorage after initial render)
  useEffect(() => {
    setTempApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setTempGeminiApiKey(geminiApiKey);
  }, [geminiApiKey]);

  const handleSaveApiKeys = () => {
    updateApiKey(tempApiKey);
    setGeminiApiKey(tempGeminiApiKey); // Save Gemini Key
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
                {apiKey && geminiApiKey ? 'Update API Keys' : 'Set API Keys'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Keys</DialogTitle>
                <DialogDescription>
                  Enter your YouTube Data API v3 key and Gemini API key. These are stored in your browser's localStorage.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="youtubeKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube Data API Key</label>
                  <Input
                    id="youtubeKey"
                    type="password"
                    placeholder="Enter your YouTube API key"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="geminiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
                  <Input
                    id="geminiKey"
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    value={tempGeminiApiKey}
                    onChange={(e) => setTempGeminiApiKey(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveApiKeys}>
                    Save Keys
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

