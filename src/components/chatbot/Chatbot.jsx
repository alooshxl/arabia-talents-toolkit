// src/components/chatbot/Chatbot.jsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Added ScrollBar for potential use
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { MessageSquare, Send, X } from 'lucide-react';
import geminiApiService from '@/services/geminiApiService'; // Added import

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I help you? / مرحبًا! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null); // Ref for the end of messages list

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSendMessage = async () => {
    if (message.trim() === '') return;

    const userMessage = { id: Date.now(), sender: 'user', text: message.trim() };
    // Add user message to conversation immediately for responsiveness
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setMessage('');
    setIsLoading(true);

    // Prepare messages for the API - take the updatedConversation
    const apiMessages = updatedConversation.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model', // Gemini uses 'model' for bot
      parts: [{ text: msg.text }]
    }));

    try {
      // Call the service with the current conversation history including the new user message
      const botReplyText = await geminiApiService.getChatbotResponse(apiMessages);
      const botMessage = { id: Date.now() + 1, sender: 'bot', text: botReplyText };
      setConversation(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to get bot response:", error);
      const errorMessageText = error.message.includes('API key not configured')
        ? "Sorry, the chatbot service is not configured correctly. Please contact support."
        : "Sorry, I couldn't connect to the service or something went wrong. Please try again.";
      const errorMessage = { id: Date.now() + 1, sender: 'bot', text: errorMessageText };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatbot = () => setIsOpen(!isOpen);

  if (!isOpen) {
    return (
      <Button
        onClick={toggleChatbot}
        className="fixed bottom-4 right-4 p-4 rounded-full shadow-lg z-50"
        size="icon"
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <Card className="w-80 h-[450px] shadow-xl flex flex-col sm:w-96 sm:h-[500px] rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 border-b">
          <CardTitle className="text-base sm:text-lg">Chat Assistant</CardTitle>
          <Button variant="ghost" size="icon" onClick={toggleChatbot} aria-label="Close chat">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow p-3 sm:p-4 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-2"> {/* Added pr-2 for scrollbar spacing */}
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] p-2 rounded-lg text-sm break-words ${ // Added break-words
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] p-2 rounded-lg bg-muted text-sm animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} /> {/* Element to scroll to */}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-3 sm:p-4 border-t">
          <div className="flex w-full space-x-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || message.trim() === ''} aria-label="Send message">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
