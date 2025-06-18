import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const AnalysisControls = ({
  onAnalyzeClick,
  isLoading, // This should be the combined loading state (fetching OR analyzing)
  loadingMessage,
  showOnlySponsored,
  setShowOnlySponsored,
  hasChannelUrl,
  hasResults,
  isAnalyzing, // Specific flag if analysis part is running
  isFetching // Specific flag if fetching part is running
}) => {

  let buttonText = 'Analyze Videos';
  if (isLoading) {
    if (isFetching) buttonText = loadingMessage || 'Fetching Videos...';
    else if (isAnalyzing) buttonText = loadingMessage || 'Analyzing...';
    else buttonText = loadingMessage || 'Processing...';
  }

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="showOnlySponsored"
            checked={showOnlySponsored}
            onCheckedChange={setShowOnlySponsored}
            disabled={isLoading || !hasResults}
          />
          <Label htmlFor="showOnlySponsored">Show Only Sponsored Videos</Label>
        </div>
        <Button
          onClick={onAnalyzeClick}
          disabled={isLoading || !hasChannelUrl}
          className="w-full md:w-auto min-w-[150px]" // Added min-width
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};
export default AnalysisControls;
