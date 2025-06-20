import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import geminiApiService from '@/services/geminiApiService';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ArabiaTalentsAI() {
  const { geminiApiKey } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'ai', content: "Hi! I'm Arabia Talents AI. Ask me anything." }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const conversation = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n') + '\nAI:';
      const reply = await geminiApiService.generateContent(
        geminiApiKey,
        conversation,
        `chat_${Date.now()}`
      );
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div>
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-background rounded-lg shadow-lg flex flex-col border">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-semibold">Arabia Talents AI</span>
            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-full break-words p-2 rounded-md',
                  m.role === 'user'
                    ? 'bg-primary/10 self-end ml-auto'
                    : 'bg-muted'
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="text-center text-xs text-muted-foreground">Loading...</div>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t flex gap-2">
            <Textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 resize-none"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>Send</Button>
          </div>
        </div>
      )}

      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-4 right-4 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle />
        </Button>
      )}
    </div>
  );
}
