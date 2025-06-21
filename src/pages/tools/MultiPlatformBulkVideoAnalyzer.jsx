import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import multiPlatformVideoService from '@/services/multiPlatformVideoService';
import { formatNumber, formatDate, parseBulkInput } from '@/utils/helpers';
import { Youtube, Instagram, Facebook, Download } from 'lucide-react';

export default function MultiPlatformBulkVideoAnalyzer() {
  const { setLoading, setError } = useAppContext();
  const [videoUrls, setVideoUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const iconForPlatform = (platform) => {
    if (platform === 'youtube') return <Youtube className="h-4 w-4" />;
    if (platform === 'instagram') return <Instagram className="h-4 w-4" />;
    if (platform === 'facebook') return <Facebook className="h-4 w-4" />;
    return null;
  };

  const handleAnalyze = async () => {
    if (!videoUrls.trim()) return;
    setIsAnalyzing(true);
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const urls = parseBulkInput(videoUrls);
      if (urls.length === 0) throw new Error('No valid URLs provided');
      const analysis = [];
      for (const url of urls) {
        const platform = multiPlatformVideoService.detectPlatform(url);
        if (!platform) {
          analysis.push({ videoUrl: url, error: 'Unsupported URL' });
          continue;
        }
        try {
          let data = null;
          if (platform === 'youtube') {
            data = await multiPlatformVideoService.fetchYouTubeData(url, youtubeApiService);
            if (!data.error) data.duration = parseDuration(data.duration);
          } else if (platform === 'tiktok') {
            data = await multiPlatformVideoService.fetchTikTokData(url);
          } else if (platform === 'instagram') {
            data = await multiPlatformVideoService.fetchInstagramData(url);
          } else if (platform === 'facebook') {
            data = await multiPlatformVideoService.fetchFacebookData(url);
          }
          if (data.error) {
            analysis.push({ videoUrl: url, error: data.error, platform });
          } else {
            const engagement = data.views > 0 ? (((data.likes || 0) + (data.comments || 0)) / data.views * 100).toFixed(2) : '0.00';
            analysis.push({
              platform,
              username: data.username,
              videoUrl: data.videoUrl,
              views: data.views,
              likes: data.likes,
              comments: data.comments,
              duration: data.duration || 'N/A',
              publishDate: data.publishDate,
              engagementRate: engagement
            });
          }
        } catch (err) {
          analysis.push({ videoUrl: url, error: err.message, platform });
        }
      }
      setResults(analysis);
    } catch (e) {
      setError(e.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  const parseDuration = (duration) => {
    if (!duration) return 'N/A';
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return duration;
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    const h = hours ? parseInt(hours) : 0;
    const m = minutes ? parseInt(minutes) : 0;
    const s = seconds ? parseInt(seconds) : 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyTable = () => {
    if (results.length === 0) return;
    const headers = ['Platform','Username','Video URL','Views','Likes','Comments','Duration','Publish Date','Engagement Rate'];
    const rows = results.map(r => [r.platform,r.username,r.videoUrl,r.views,r.likes,r.comments,r.duration,formatDate(r.publishDate),r.engagementRate].join('\t'));
    navigator.clipboard.writeText([headers.join('\t'), ...rows].join('\n'));
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Multi-Platform Bulk Video Analyzer</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter Video URLs</CardTitle>
          <CardDescription>Analyze videos from YouTube, Instagram, TikTok, and Facebook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea className="min-h-32" value={videoUrls} onChange={(e) => setVideoUrls(e.target.value)} placeholder="Paste URLs, one per line" />
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !videoUrls.trim()} className="w-full sm:w-auto">
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
                <CardTitle>Results</CardTitle>
                <CardDescription>Analyzed {results.length} videos</CardDescription>
              </div>
              <Button onClick={copyTable} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Copy to Clipboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Username</TableHead>
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
                  {results.map((r, i) => (
                    <TableRow key={i} className={r.error ? 'opacity-50' : ''}>
                      <TableCell>{iconForPlatform(r.platform)} {r.platform || 'Unknown'}</TableCell>
                      <TableCell>{r.username || '-'}</TableCell>
                      <TableCell><a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a></TableCell>
                      <TableCell className="text-right">{r.views ? formatNumber(r.views) : '-'}</TableCell>
                      <TableCell className="text-right">{r.likes ? formatNumber(r.likes) : '-'}</TableCell>
                      <TableCell className="text-right">{r.comments ? formatNumber(r.comments) : '-'}</TableCell>
                      <TableCell className="text-right">{r.duration}</TableCell>
                      <TableCell className="text-right">{r.publishDate ? formatDate(r.publishDate) : '-'}</TableCell>
                      <TableCell className="text-right">{r.engagementRate ? `${r.engagementRate}%` : (r.error || 'N/A')}</TableCell>
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
