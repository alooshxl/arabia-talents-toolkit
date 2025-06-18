import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react'; // Added CheckCircle2, XCircle

const ResultsTable = ({
  videos, // Will now be analyzedVideosList
  isLoading, // Combined loading state (fetching or analyzing)
  isAnalyzing, // Specific state for when analysis is in progress after fetch
  hookError,
  pageLoadingMessage // More granular loading message from page
}) => {

  const renderSponsoredStatus = (video) => {
    if (video.analysisError) return <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto" title={`Analysis Error: ${video.analysisError}`} />;
    if (video.isSponsored === undefined && isAnalyzing) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" title="Analyzing..." />; // Show loading for individual analysis
    if (video.isSponsored) return <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" title="Sponsored" />;
    if (video.isSponsored === false) return <XCircle className="h-5 w-5 text-gray-400 mx-auto" title="Not Sponsored" />;
    return <Info className="h-5 w-5 text-blue-500 mx-auto" title="Pending or Not Yet Analyzed" />;
  };

  // Initial loading for the whole table (e.g., fetching videos)
  if (isLoading && videos.length === 0 && !isAnalyzing) {
    return (
      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent className="h-48 flex flex-col justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p>{pageLoadingMessage || 'Loading video data...'}</p>
        </CardContent>
      </Card>
    );
  }

  if (hookError) { // Global error from either hook
     return (
      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent className="h-48 flex flex-col justify-center items-center text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Error: {hookError}</p>
        </CardContent>
      </Card>
    );
  }

  // No videos found after fetch, or after filtering (if filtering is done before passing to this table)
  if (!isLoading && !isAnalyzing && videos.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent className="h-48 flex flex-col justify-center items-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No videos to display. Check criteria or perform analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
            Results ({videos.length} videos)
            {isAnalyzing && videos.some(v => v.isSponsored === undefined) && <Loader2 className="h-5 w-5 animate-spin text-primary ml-2 inline" />}
        </CardTitle>
        </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%] text-center">Sponsored?</TableHead>
                <TableHead className="w-[20%]">Title</TableHead>
                <TableHead className="w-[10%]">Advertiser</TableHead>
                <TableHead className="w-[15%]">Product/Service</TableHead>
                <TableHead className="w-[15%]">Detected Keywords</TableHead>
                <TableHead className="w-[10%]">Published</TableHead>
                <TableHead className="w-[5%]">Duration</TableHead>
                <TableHead className="w-[5%]">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="text-center">{renderSponsoredStatus(video)}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate" title={video.title}>{video.title}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={video.advertiserName}>{video.advertiserName || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={video.productOrService}>{video.productOrService || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate" title={video.detectedKeywords}>{video.detectedKeywords || '-'}</TableCell>
                  <TableCell>{video.publishedAt}</TableCell>
                  <TableCell>{video.durationInSeconds}</TableCell>
                  <TableCell>
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Watch
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
export default ResultsTable;
