import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, formatDate, parseBulkInput, extractVideoId, calculateEngagementRate } from '@/utils/helpers';
import { Film, Download, Eye, ThumbsUp, MessageCircle, Calendar } from 'lucide-react';

export default function BulkVideoAnalyzer() {
  const { setLoading, setError } = useAppContext();
  const [videoUrls, setVideoUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!videoUrls.trim()) return;
    
    setIsAnalyzing(true);
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const urls = parseBulkInput(videoUrls);
      
      if (urls.length === 0) {
        throw new Error('No valid URLs provided');
      }
      
      const analysisResults = [];
      
      for (const url of urls) {
        try {
          const videoId = extractVideoId(url);
          
          if (!videoId) {
            console.error(`Could not extract video ID from URL: ${url}`);
            continue;
          }
          
          const videoDetails = await youtubeApiService.getVideoDetails(videoId);
          const engagementRate = calculateEngagementRate(videoDetails);
          
          // Parse duration from ISO 8601 format
          const duration = videoDetails.contentDetails.duration;
          const durationFormatted = parseDuration(duration);
          
          analysisResults.push({
            channelName: videoDetails.snippet.channelTitle,
            videoUrl: url,
            viewCount: parseInt(videoDetails.statistics.viewCount),
            likes: parseInt(videoDetails.statistics.likeCount || 0),
            comments: parseInt(videoDetails.statistics.commentCount || 0),
            publishedDate: videoDetails.snippet.publishedAt,
            duration: durationFormatted,
            engagementRate: parseFloat(engagementRate)
          });
        } catch (error) {
          console.error(`Error processing video URL: ${url}`, error);
        }
      }
      
      setResults(analysisResults);
      
    } catch (error) {
      console.error('Error analyzing videos:', error);
      setError(error.message || 'Failed to analyze videos. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  // Parse ISO 8601 duration to hh:mm:ss format
  const parseDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    const h = hours ? parseInt(hours) : 0;
    const m = minutes ? parseInt(minutes) : 0;
    const s = seconds ? parseInt(seconds) : 0;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Channel Name',
      'Video URL',
      'Views',
      'Likes',
      'Comments',
      'Duration',
      'Publish Date',
      'Engagement Rate'
    ];

    const rows = results.map(row => [
      `"${row.channelName.replace(/"/g, '""')}"`,
      `"${row.videoUrl.replace(/"/g, '""')}"`,
      row.viewCount,
      row.likes,
      row.comments,
      `"${row.duration.replace(/"/g, '""')}"`,
      `"${formatDate(row.publishedDate).replace(/"/g, '""')}"`,
      row.engagementRate
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_video_analysis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Bulk Video Analyzer</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter YouTube Video URLs</CardTitle>
          <CardDescription>
            Analyze multiple YouTube videos at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              className="min-h-32"
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !videoUrls.trim()}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Videos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  Analyzed {results.length} videos
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export to CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Video URL</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Publish Date</TableHead>
                    <TableHead className="text-right">Engagement Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.channelName}</TableCell>
                      <TableCell><a href={result.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a></TableCell>
                      <TableCell className="text-right">{formatNumber(result.viewCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(result.likes)}</TableCell>
                      <TableCell className="text-right">{formatNumber(result.comments)}</TableCell>
                      <TableCell className="text-right">{result.duration}</TableCell>
                      <TableCell className="text-right">{formatDate(result.publishedDate)}</TableCell>
                      <TableCell className="text-right">{result.engagementRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

