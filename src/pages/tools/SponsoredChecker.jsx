import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart as LucideBarChart, Loader2, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import youtubeApiService from '@/services/youtubeApi';
import geminiApiService from '@/services/geminiApiService';

// Charting Imports
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const getTodayDate = () => new Date().toISOString().split('T')[0];
const getOneYearAgoDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0];
};

const manualKeywords = [
// List of Arabic + English indicators for sponsorship/ad content
const sponsorshipIndicators = [
  // Direct sponsorship
  '#إعلان', '#اعلان', // Arabic for #advertisement
  'إعلان مدفوع', 'اعلان مدفوع', // Paid advertisement (Arabic)
  'برعاية', // Sponsored by (Arabic)
  'sponsored by',
  'advertisement',
  '#ad',
  'paid promotion',
  'يتضمن الترويج المدفوع', // YouTube standard Arabic
  'محتوى مدفوع',
  'مراجعة مدفوعة',
  'paid review',

  // Discount / Promo codes
  'discount code',
  'كود خصم',
  'كود الخصم',
  'promo code',
  'برومو كود',
  'coupon code',
  'خصم خاص',
  'special discount',
  'عرض خاص',
  'special offer',

  // Call to action (CTA)
  'اشترك الآن',
  'subscribe now',
  'سجل الآن',
  'register now',
  'زوروا موقع',
  'visit website',
  'لمزيد من المعلومات',
  'for more info',
  'متاح الآن',
  'available now',
  'تسوق الآن',
  'shop now',

  // Affiliations & Collaborations
  'بالتعاون مع',
  'بالشراكة مع',
  'in collaboration with',
  'in partnership with',
  'affiliation',
  'affiliate link',

  // Funding / Presentation
  'بتمويل من',
  'funded by',
  'مقدم من',
  'presented by',

  // Shortened sponsor links (common)
  'bit.ly',
  'rb.gy',
  'tinyurl.com',
  'shorturl.at',

  // Influencer-specific ads
  'استخدم كود اللاعب',
  'use player code',
  'ادعمني في اللعبة',
  'support me in-game',

  // Other phrases
  'رابط التحميل',
  'حمل اللعبة',
  'حمل التطبيق',
  'download link',
  'download game',
  'download app',
  'هذا الفيديو يحتوي على ترويج مدفوع',
  'this video contains paid promotion'
];

// Duration parser utility
function parseISO8601Duration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || 0);
  const minutes = parseInt(matches[2] || 0);
  const seconds = parseInt(matches[3] || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
}
// Chart configuration (using common color names, can be replaced with CSS variables if available)
const chartConfig = {
  sponsored: { label: "Sponsored", color: "#22c55e" }, // green-500
  nonSponsored: { label: "Non-Sponsored", color: "#ef4444" }, // red-500
  errorOrPending: { label: "Error/Pending", color: "#f59e0b" }, // amber-500
};

const SponsoredChecker = () => {
  const [channelUrl, setChannelUrl] = useState('');
  const [startDate, setStartDate] = useState(getOneYearAgoDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [useGemini, setUseGemini] = useState(true);
  const [showOnlySponsored, setShowOnlySponsored] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [summary, setSummary] = useState({
    totalChecked: 0,
    totalSponsored: 0,
    topAdvertisers: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const [youtubeApiKeyExists, setYoutubeApiKeyExists] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(null);
  const [geminiKeyExists, setGeminiKeyExists] = useState(false);


  useEffect(() => {
    const ytKey = youtubeApiService.getApiKey();
    setYoutubeApiKeyExists(!!ytKey);

    const gmKey = localStorage.getItem('gemini-api-key') || '';
    if (gmKey) {
      setGeminiApiKey(gmKey);
      setGeminiKeyExists(true);
    } else {
      setGeminiKeyExists(false);
    }
  }, []);

  const parseGeminiResponse = (responseText) => {
    const result = { sponsored: 'لا', product: '', advertiser: '', keywords: '', error: null };
    if (!responseText || typeof responseText !== 'string') {
        result.error = 'Empty or invalid response from Gemini.';
        result.sponsored = 'خطأ';
        return result;
    }

    if (responseText.toLowerCase().includes("not sponsored") || responseText.includes("غير مدعوم")) {
        result.sponsored = 'لا';
        return result;
    }

    const lines = responseText.split('\n');
    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key.includes('Sponsored') || key.includes('مدعوم')) result.sponsored = value;
        else if (key.includes('الإعلان عن') || key.includes('Product/Service')) result.product = value;
        else if (key.includes('اسم المعلن') || key.includes('Advertiser Name')) result.advertiser = value;
        else if (key.includes('الكلمات الدالة') || key.includes('Keywords')) result.keywords = value;
    });

    if (result.sponsored.toLowerCase().includes('نعم') || result.sponsored.toLowerCase().includes('yes')) {
        result.sponsored = 'نعم';
    } else if (result.sponsored.toLowerCase().includes('لا') || result.sponsored.toLowerCase().includes('no')) {
        result.sponsored = 'لا';
    } else if (result.sponsored.trim() === '' && (result.product || result.advertiser || result.keywords)) {
        result.sponsored = 'نعم';
    } else if (result.sponsored.trim() === '') {
        result.sponsored = 'لا';
    }
    return result;
  };

  const analyzeDescriptionManually = (description) => {
    const lowerDesc = description.toLowerCase();
    for (const keyword of manualKeywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return { sponsored: 'نعم', product: 'N/A (Manual)', advertiser: 'N/A (Manual)', keywords: keyword, error: null };
      }
    }
    return { sponsored: 'لا', product: '', advertiser: '', keywords: '', error: null };
  };

  const analyzeDescriptionWithGemini = async (videoTitle, description) => {
    if (!geminiApiKey) {
      return { sponsored: 'خطأ', product: 'Gemini API Key Missing', advertiser: '', keywords: '', error: 'API Key Missing' };
    }
    const prompt = `
You are an expert content analyst. Analyze the following YouTube video title and description to determine if it contains any form of **sponsorship, advertisement, or brand promotion**, especially those targeting Arabic-speaking audiences.

Video Title:
---
${videoTitle}
---
Video Description:
---
${description}
---

Your tasks:

1.  Determine if this video is **sponsored or contains an advertisement**. The ad may be written in Arabic, English, or a mix of both. Consider direct mentions, affiliate links, promo codes, or strong calls to action for products/services.

2.  If it is sponsored:
    *   What kind of product/service is being advertised? (e.g., mobile game, app, clothing brand, VPN, software tool, course)
    *   What is the **name of the brand or advertiser**, if known? (If a specific name is not mentioned, but a type of product is, note that. E.g., "A mobile game" or "Clothing website")
    *   What are the **keywords, hashtags, or phrases** that indicate sponsorship? (e.g., #إعلان, رابط التحميل, Sponsored by X, discount code XYZ). List the most prominent ones.

3.  If there is no clear sign of sponsorship, just state: "Not sponsored."

Respond in **Arabic** if the description is primarily Arabic, otherwise respond in English. Use this format strictly:

**Sponsored:** نعم / لا
**الإعلان عن:** {نوع المنتج أو الخدمة}
**اسم المعلن:** {اسم المعلن إن وجد أو نوع المنتج}
**الكلمات الدالة:** {كلمات أو عبارات رُصدت}
`;
    try {
// Ensure inputs to hashing are strings and use the correct service for hashing
const stringToHash = String(videoTitle || '') + String(description || '');
const cacheKey = `sponsorship_analysis_${youtubeApiService._hashString(stringToHash)}`;

      const geminiResponseText = await geminiApiService.generateContent(geminiApiKey, prompt, cacheKey);
      return parseGeminiResponse(geminiResponseText);
    } catch (error) {
      console.error("Error analyzing with Gemini:", error);
      return { sponsored: 'خطأ', product: `Gemini Error: ${error.message}`, advertiser: '', keywords: '', error: error.message };
    }
  };

  const fetchChannelId = useCallback(async (url) => {
    setLoadingMessage('Resolving channel ID...');
    let id = youtubeApiService.extractChannelId(url);
    if (id) return id;
    try {
      id = await youtubeApiService.getChannelIdFromCustomUrl(url);
      if (id) return id;
    } catch (error) { console.error("Error resolving channel ID from custom URL:", error); }
    alert(`Could not automatically resolve Channel ID from URL: ${url}. Please try a different URL format.`);
    return null;
  }, []);

  const fetchVideos = useCallback(async (channelId, sDate, eDate) => {
    setLoadingMessage('Fetching videos list (up to 200)...');
    let allVideoIds = [];
    let nextPageToken = null;
    const maxVideosToFetch = 200; const resultsPerPage = 50;
    const publishedAfter = new Date(sDate).toISOString();
    const publishedBefore = new Date(new Date(eDate).setDate(new Date(eDate).getDate() + 1)).toISOString();

    for (let i = 0; i < maxVideosToFetch / resultsPerPage; i++) {
      try {
        const params = { part: 'id', channelId, type: 'video', order: 'date', maxResults: resultsPerPage, publishedAfter, publishedBefore, pageToken: nextPageToken };
        const searchData = await youtubeApiService.makeRequest('search', params);
        if (searchData.items) allVideoIds.push(...searchData.items.map(item => item.id.videoId));
        nextPageToken = searchData.nextPageToken;
        if (!nextPageToken || allVideoIds.length >= maxVideosToFetch) break;
      } catch (error) {
        console.error("Error fetching videos page:", error);
        alert(`Error fetching videos: ${error.message}. Some videos may be missing.`);
        break;
      }
    }
    return allVideoIds.slice(0, maxVideosToFetch);
  }, []);

  const handleAnalyzeVideos = async () => {
    if (!youtubeApiKeyExists) { alert("YouTube API Key not found. Please set it."); return; }
    if (useGemini && !geminiKeyExists) { alert("Gemini API Key not found. Please set it or disable Gemini Analysis."); return; }
    if (!channelUrl) { alert("Please enter a YouTube Channel URL."); return; }

    setIsLoading(true); setAnalysisResults([]);
    setSummary({ totalChecked: 0, totalSponsored: 0, topAdvertisers: [] });
    let currentVideoIndex = 0;

    try {
      const resolvedChannelId = await fetchChannelId(channelUrl);
      if (!resolvedChannelId) { setIsLoading(false); return; }

      const videoIds = await fetchVideos(resolvedChannelId, startDate, endDate);
      if (!videoIds || videoIds.length === 0) {
        setLoadingMessage('No videos found for the selected criteria.');
        setTimeout(() => setLoadingMessage(''), 3000); setIsLoading(false); return;
      }

      setLoadingMessage(`Fetching details for ${videoIds.length} videos...`);
const fetchedVideoDetailsList = await youtubeApiService.getMultipleVideoDetails(videoIds);

// Filter videos by duration (>= 60 seconds)
const videosToAnalyze = fetchedVideoDetailsList.filter(video => {
  const durationInSeconds = parseISO8601Duration(video.contentDetails?.duration);
  return durationInSeconds >= 60;
});

if (videosToAnalyze.length === 0) {
  setLoadingMessage(`No videos found with duration >= 60 seconds from the ${fetchedVideoDetailsList.length} fetched videos.`);
  setTimeout(() => setLoadingMessage(''), 4000);
  setSummary({ totalChecked: 0, totalSponsored: 0, topAdvertisers: [] }); // Reflect that 0 videos were actually checked
  setIsLoading(false);
  return;
}

let processedResults = [];
let sponsoredCount = 0;
const advertiserFrequency = {};
const totalVideosToAnalyze = videosToAnalyze.length;

for (const video of videosToAnalyze) {
  currentVideoIndex++;
  setLoadingMessage(`Analyzing video ${currentVideoIndex} of ${totalVideosToAnalyze}: ${video.snippet.title.substring(0, 30)}...`);

        let analysis;
        if (useGemini) {
          analysis = await analyzeDescriptionWithGemini(video.snippet.title, video.snippet.description);
          if (currentVideoIndex < videoDetailsList.length) await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          analysis = analyzeDescriptionManually(video.snippet.description);
        }

        const isSponsored = analysis.sponsored === 'نعم';
        if (isSponsored) {
          sponsoredCount++;
          if (analysis.advertiser && analysis.advertiser !== 'N/A (Manual)' && !analysis.advertiser.startsWith('Gemini')) {
            advertiserFrequency[analysis.advertiser] = (advertiserFrequency[analysis.advertiser] || 0) + 1;
          }
        }

        processedResults.push({
          id: video.id, title: video.snippet.title, description: video.snippet.description.substring(0, 200) + "...",
          publishDate: video.snippet.publishedAt.split('T')[0], videoLink: `https://www.youtube.com/watch?v=${video.id}`,
          sponsored: analysis.sponsored, advertiser: analysis.advertiser, product: analysis.product,
          keywords: analysis.keywords, analysisError: analysis.error
        });
        setAnalysisResults([...processedResults]);
      }

      const topAdvertisers = Object.entries(advertiserFrequency).sort(([,a],[,b]) => b-a).slice(0, 5).map(([name, count]) => `${name} (${count} videos)`);
setSummary({
  totalChecked: videosToAnalyze.length,
  totalSponsored: sponsoredCount,
  topAdvertisers
});


    } catch (error) {
      console.error("Error during analysis:", error); alert(`An error occurred: ${error.message}`);
      setLoadingMessage(`Error: ${error.message}.`);
    } finally { setIsLoading(false); setLoadingMessage(''); }
  };

  const filteredResults = showOnlySponsored ? analysisResults.filter(video => video.sponsored === 'نعم') : analysisResults;

  const renderSponsoredStatus = (status, error) => {
    if (error) return <AlertTriangle className="h-5 w-5 text-red-500" title={error} />;
    if (status === 'نعم') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === 'لا') return <XCircle className="h-5 w-5 text-gray-400" />;
    if (status === 'خطأ') return <AlertTriangle className="h-5 w-5 text-red-500" title="Analysis error" />;
    return <Info className="h-5 w-5 text-blue-500" title="Pending/Unknown" />;
  };

  const sponsorshipChartData = useMemo(() => {
    const sponsored = analysisResults.filter(v => v.sponsored === 'نعم').length;
    const nonSponsored = analysisResults.filter(v => v.sponsored === 'لا').length;
    const errorOrPending = analysisResults.filter(v => v.sponsored !== 'نعم' && v.sponsored !== 'لا').length;

    return [
      { name: 'Sponsored', videos: sponsored, fill: chartConfig.sponsored.color },
      { name: 'Non-Sponsored', videos: nonSponsored, fill: chartConfig.nonSponsored.color },
      { name: 'Error/Pending', videos: errorOrPending, fill: chartConfig.errorOrPending.color },
    ].filter(item => item.videos > 0); // Only show categories with data
  }, [analysisResults]);

  if (!youtubeApiKeyExists) {
    return (<div className="container mx-auto p-4 text-center"><Card><CardHeader><CardTitle>API Key Required</CardTitle></CardHeader><CardContent><p className="text-red-500">YouTube API Key is not set. Please configure it.</p></CardContent></Card></div>);
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">Sponsored Content Checker</h1>
      <Card> {/* Configuration Card */}
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!geminiKeyExists && (<div className="p-3 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300" role="alert"><AlertTriangle className="inline w-4 h-4 mr-2" />Gemini API Key not found. Analysis will use manual keyword matching. Set key for AI analysis.</div>)}
          <div><Label htmlFor="channelUrl">YouTube Channel URL</Label><Input id="channelUrl" type="url" placeholder="https://www.youtube.com/channel/UCSHZKyawb77ixDdsGog4iWA" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} disabled={isLoading} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isLoading} /></div>
            <div><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isLoading} /></div>
          </div>
          <div className="flex items-center space-x-2"><Switch id="useGemini" checked={useGemini} onCheckedChange={setUseGemini} disabled={isLoading || !geminiKeyExists} /><Label htmlFor="useGemini">Use Gemini Advanced Analysis {geminiKeyExists ? '(Higher Accuracy)' : '(API Key Missing)'}</Label></div>
          <Button onClick={handleAnalyzeVideos} className="w-full md:w-auto" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{isLoading ? loadingMessage || 'Analyzing...' : 'Analyze Videos'}</Button>
        </CardContent>
      </Card>

      <Card> {/* Summary Card */}
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p>Total Videos Checked: {summary.totalChecked}</p>
          <p>Sponsored Videos Found: {summary.totalSponsored}</p>
          <p>Top Advertisers: {summary.topAdvertisers.length > 0 ? summary.topAdvertisers.join('; ') : 'N/A'}</p>

          {analysisResults.length > 0 ? (
            <div className="h-[250px] mt-4"> {/* Increased height for chart area */}
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={sponsorshipChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}> {/* Adjusted margins */}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30}/>
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent hideLabel />} />
                  <Legend content={<ChartLegendContent />} />
                  <Bar dataKey="videos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="p-4 border rounded-md text-center bg-gray-50 dark:bg-gray-800 h-[250px] flex flex-col justify-center items-center">
              <LucideBarChart className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm text-muted-foreground">Sponsorship overview chart will appear here after analysis.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card> {/* Results Card */}
        <CardHeader><CardTitle>Analysis Results ({filteredResults.length} videos)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4"><Switch id="showOnlySponsored" checked={showOnlySponsored} onCheckedChange={setShowOnlySponsored} disabled={isLoading || analysisResults.length === 0} /><Label htmlFor="showOnlySponsored">Show Only Sponsored Videos</Label></div>
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
                <TableHead className="w-1/12">Sponsored?</TableHead><TableHead className="w-3/12">Title</TableHead>
                <TableHead className="w-2/12">Advertiser Name</TableHead><TableHead className="w-2/12">Product/Service</TableHead>
                <TableHead className="w-1/12">Publish Date</TableHead><TableHead className="w-2/12">Keywords (Detected)</TableHead>
                <TableHead className="w-1/12">Link</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && analysisResults.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="inline mr-2 h-5 w-5 animate-spin" />{loadingMessage || 'Loading...'}</TableCell></TableRow>
              ) : filteredResults.length > 0 ? (
                filteredResults.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="text-center">{renderSponsoredStatus(video.sponsored, video.analysisError)}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={video.title}>{video.title}</TableCell>
                    <TableCell className="max-w-xs truncate" title={video.advertiser}>{video.advertiser || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={video.product}>{video.product || '-'}</TableCell>
                    <TableCell>{video.publishDate}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={video.keywords}>{video.keywords || '-'}</TableCell>
                    <TableCell><a href={video.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Watch</a></TableCell>
                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={7} className="text-center">{analysisResults.length > 0 && filteredResults.length === 0 ? 'No videos match filter.' : 'No results yet. Configure & click "Analyze".'}</TableCell></TableRow>)}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SponsoredChecker;
