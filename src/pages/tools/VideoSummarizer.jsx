import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import geminiApiService from '@/services/geminiApiService';

// Helper function to extract Video ID
function extractVideoIdFromUrl(url) {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('watch')) {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/embed/')) {
      videoId = urlObj.pathname.split('/embed/')[1];
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/shorts/')) {
      videoId = urlObj.pathname.split('/shorts/')[1];
    }
    // Remove any extra query params from videoId if present
    if (videoId && videoId.includes('&')) {
        videoId = videoId.split('&')[0];
    }
    if (videoId && videoId.includes('?')) { // Handle cases like shorts?si=...
        videoId = videoId.split('?')[0];
    }
    return videoId;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
}

export default function VideoSummarizer() {
  const { geminiApiKey, setLoading, setError, loading: isLoading } = useAppContext(); // Use global loading
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  // const [summary, setSummary] = useState(''); // Remove this
  const [arabicSummary, setArabicSummary] = useState(''); // New state for Arabic summary
  const [topics, setTopics] = useState(''); // Keep for key topics
  const [briefComparisonAnalysis, setBriefComparisonAnalysis] = useState(''); // New state for brief analysis
  const [videoBrief, setVideoBrief] = useState('');
  // const [isLoading, setIsLoading] = useState(false); // Removed local loading state

  const handleSummarize = async () => {
    if (!geminiApiKey) {
      setError('Gemini API key is not set. Please set it in the header.');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoTitle('');
    setVideoDescription('');
    // setSummary(''); // Update for new state variable
    setArabicSummary('');
    setTopics(''); // Assuming topics are still cleared
    setBriefComparisonAnalysis('');

    try {
      const videoId = extractVideoIdFromUrl(videoUrl);
      if (!videoId) {
        setError('Invalid YouTube video URL or could not extract video ID.');
        setLoading(false);
        return;
      }

      let currentVideoTitle = '';
      let currentVideoDescription = '';

      try {
        const details = await youtubeApiService.getVideoDetails(videoId);
        if (details && details.snippet) {
          currentVideoTitle = details.snippet.title;
          currentVideoDescription = details.snippet.description;
          setVideoTitle(currentVideoTitle);
          setVideoDescription(currentVideoDescription);
        } else {
          throw new Error('Could not fetch video details or details are incomplete.');
        }
      } catch (ytError) {
        console.error('YouTube API Error:', ytError);
        setError(`Failed to fetch video details: ${ytError.message}`);
        setLoading(false); // Stop loading as we can't proceed
        return;
      }

      // New enhanced prompt construction
      let prompt = `يرجى تحليل محتوى فيديو يوتيوب التالي وتقديم ما يلي:

1.  **ملخص الفيديو**: قدم ملخصًا باللغة العربية يتكون من 8 إلى 10 نقاط غنية بالتفاصيل.
2.  **النقاط الرئيسية**: حدد 5 إلى 7 مواضيع رئيسية أو كلمات مفتاحية تمت مناقشتها في الفيديو.

تفاصيل الفيديو:
العنوان: ${currentVideoTitle}
الوصف:
${currentVideoDescription}
`;

      if (videoBrief && videoBrief.trim() !== '') {
        prompt += `

3.  **تحليل التوافق مع الموجز**: يرجى مقارنة الملخص الذي أنشأته أعلاه (أو محتوى الفيديو بناءً على العنوان والوصف) مع الموجز التالي المقدم من المستخدم. قم بتحليل مدى توافق محتوى الفيديو مع هذا الموجز، مع إبراز نقاط التوافق والاختلاف الرئيسية.
الموجز المقدم من المستخدم:
${videoBrief}
`;
      }

      try {
        const geminiResponse = await geminiApiService.generateContent(geminiApiKey, prompt);

        let extractedSummary = 'لم يتمكن من استخلاص الملخص.';
        let extractedTopics = 'لم يتمكن من استخلاص النقاط الرئيسية.';
        let extractedBriefAnalysis = ''; // Default to empty if no brief was provided or not found

        // Improved Regex: Optional numbering (e.g., "1."), optional bolding, flexible spacing around colon.
        // Captures content until the next section marker or end of string.
        const summaryRegex = /(?:1\.\s*)?(?:\*\*| *)ملخص الفيديو(?:\*\*| *)\s*:(.*?)(?=(?:2\.\s*)?(?:\*\*| *)النقاط الرئيسية(?:\*\*| *)\s*[:]|(?:3\.\s*)?(?:\*\*| *)تحليل التوافق مع الموجز(?:\*\*| *)\s*[:]| $)/is; // Corrected L$ to $
        const summaryMatch = geminiResponse.match(summaryRegex);
        if (summaryMatch && summaryMatch[1]) {
          extractedSummary = summaryMatch[1].trim();
        }

        const topicsRegex = /(?:2\.\s*)?(?:\*\*| *)النقاط الرئيسية(?:\*\*| *)\s*:(.*?)(?=(?:3\.\s*)?(?:\*\*| *)تحليل التوافق مع الموجز(?:\*\*| *)\s*[:]| $)/is; // Corrected L$ to $
        const topicsMatch = geminiResponse.match(topicsRegex);
        if (topicsMatch && topicsMatch[1]) {
          extractedTopics = topicsMatch[1].trim();
        }

        // If a video brief was sent, try to extract the brief analysis part
        if (videoBrief && videoBrief.trim() !== '') {
          extractedBriefAnalysis = 'لم يتمكن من استخلاص تحليل التوافق مع الموجز.'; // Default if section expected but not found
          const briefAnalysisRegex = /(?:3\.\s*)?(?:\*\*| *)تحليل التوافق مع الموجز(?:\*\*| *)\s*:(.*)/is;
          const briefAnalysisMatch = geminiResponse.match(briefAnalysisRegex);
          if (briefAnalysisMatch && briefAnalysisMatch[1]) {
            extractedBriefAnalysis = briefAnalysisMatch[1].trim();
          }
        }

        setArabicSummary(extractedSummary);
        setTopics(extractedTopics);
        if (videoBrief && videoBrief.trim() !== '') { // Only set if brief was sent
            setBriefComparisonAnalysis(extractedBriefAnalysis);
        } else {
            setBriefComparisonAnalysis(''); // Clear it if no brief was sent
        }

      } catch (geminiError) {
        console.error('Gemini API Error:', geminiError);
        setError(`Failed to generate content with Gemini: ${geminiError.message}`);
      }

    } catch (error) { // Catch errors from video ID extraction or other unexpected issues
      console.error('Summarization Process Error:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Video Summarizer & Topic Extractor</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter Video URL</CardTitle>
          <CardDescription>
            Paste a YouTube video URL below to get its summary and key topics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="videoUrlInput">YouTube Video URL</Label>
            <Input
              id="videoUrlInput"
              type="url"
              placeholder="https://www.youtube.com/watch?v=example"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="videoBriefInput">Video Brief (Optional)</Label>
            <Textarea
              id="videoBriefInput"
              placeholder="Paste an optional brief for the video content here. The AI will compare its summary against this brief."
              value={videoBrief}
              onChange={(e) => setVideoBrief(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>
          <Button onClick={handleSummarize} disabled={isLoading || !videoUrl.trim()} className="w-full sm:w-auto">
            {isLoading ? 'Summarizing...' : 'Summarize Video'}
          </Button>
        </CardContent>
      </Card>

      { !isLoading && (videoTitle || videoDescription || arabicSummary || topics || briefComparisonAnalysis) && (
        <div className="space-y-6 mt-8">
          <Card>
            <CardHeader><CardTitle>Video Details</CardTitle></CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-1">Title:</h3>
              <p className="text-muted-foreground mb-3">{videoTitle || 'Not available or not fetched yet.'}</p>
              <h3 className="font-semibold mb-1">Original Description:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{videoDescription || 'Not available or not fetched yet.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>AI Generated Content</CardTitle></CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-1 text-lg">ملخص الفيديو (Arabic Summary):</h3>
              <p className="text-muted-foreground mb-3 whitespace-pre-wrap" dir="rtl">{arabicSummary || 'لم يتم إنشاؤها أو غير متوفرة بعد.'}</p>

              <h3 className="font-semibold mb-1 text-lg">النقاط الرئيسية (Key Topics):</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">{topics || 'لم يتم إنشاؤها أو غير متوفرة بعد.'}</p>
            </CardContent>
          </Card>

          {videoBrief && videoBrief.trim() !== '' && briefComparisonAnalysis && (
          <Card>
            <CardHeader><CardTitle>Video Brief Alignment Analysis</CardTitle></CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-1 text-lg">تحليل التوافق مع الموجز:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">{briefComparisonAnalysis || 'لم يتم إنشاؤها أو غير متوفرة بعد.'}</p>
            </CardContent>
          </Card>
          )}
        </div>
      )}
    </div>
  );
}
