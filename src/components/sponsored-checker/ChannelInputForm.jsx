import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const ChannelInputForm = ({
  channelUrl, setChannelUrl,
  startDate, setStartDate,
  endDate, setEndDate,
  youtubeApiKey, setYoutubeApiKey,
  onSaveYoutubeApiKey, // Renamed for clarity
  geminiApiKey, setGeminiApiKey, // New props for Gemini API Key
  onSaveGeminiApiKey,   // New prop
  geminiKeyExists,      // To control Gemini switch
  isLoading // Combined loading state from parent
}) => {
  return (
    <Card>
      <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* YouTube API Key Input */}
        <div>
          <Label htmlFor="youtubeApiKey">YouTube API Key</Label>
          <div className="flex space-x-2">
            <Input
              id="youtubeApiKey"
              type="password"
              placeholder="Enter YouTube API Key"
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={onSaveYoutubeApiKey} disabled={isLoading}>Save YouTube Key</Button>
          </div>
        </div>

        {/* Gemini API Key Input */}
        <div>
          <Label htmlFor="geminiApiKey">Gemini API Key</Label>
          <div className="flex space-x-2">
            <Input
              id="geminiApiKey"
              type="password"
              placeholder="Enter Gemini API Key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={onSaveGeminiApiKey} disabled={isLoading}>Save Gemini Key</Button>
          </div>
        </div>

        {/* Channel URL Input */}
        <div>
          <Label htmlFor="channelUrl">YouTube Channel URL</Label>
          <Input
            id="channelUrl"
            type="url"
            placeholder="https://www.youtube.com/channel/UCSAMPLEKEY"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Use Gemini Switch */}
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="useGemini"
            // checked prop will be managed by parent's useGemini state
            // onCheckedChange will be parent's setUseGemini state
            // disabled state also managed by parent via isLoading and geminiKeyExists
            // This component now only needs to display it based on props.
            // The actual `checked` and `onCheckedChange` will be passed from SponsoredCheckerPage.
            disabled={isLoading || !geminiKeyExists}
          />
          <Label htmlFor="useGemini">
            Use Gemini Advanced Analysis
            {!geminiKeyExists && <span className="text-xs text-muted-foreground"> (API Key Missing)</span>}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
export default ChannelInputForm;
