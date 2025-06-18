import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import geminiApiService from '@/services/geminiApiService';
import ErrorBoundary from '@/components/utils/ErrorBoundary';

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
  const [englishSummary, setEnglishSummary] = useState('');
  const [arabicSummary, setArabicSummary] = useState('');
  const [englishKeyPoints, setEnglishKeyPoints] = useState('');
  const [arabicKeyPoints, setArabicKeyPoints] = useState('');
  const [transcriptNotice, setTranscriptNotice] = useState('');
  // const [isLoading, setIsLoading] = useState(false); // Removed local loading state

  const handleSummarize = async () => {
    setError(null); // Clear previous errors first
    if (!geminiApiKey) {
      setError('Gemini API key is not set. Please set it in the header.');
      return;
    }

    setLoading(true);
    // setError(null); // Moved up
    setVideoTitle('');
    setVideoDescription('');
    setEnglishSummary('');
    setArabicSummary('');
    setEnglishKeyPoints('');
    setArabicKeyPoints('');
    setTranscriptNotice('');

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

      let transcript = null;
      try {
        console.log(`Fetching transcript for video ID: ${videoId}`);
        transcript = await youtubeApiService.getVideoTranscript(videoId);
        if (transcript && transcript.trim() !== '') {
          console.log('Successfully fetched transcript.');
          setTranscriptNotice('Transcript found. Summary will be based on the full video content.');
        } else {
          console.log('Transcript not available or empty.');
          // transcript might be null or empty string here
          transcript = null; // Ensure it's strictly null if empty for downstream logic
          setTranscriptNotice('Transcript not available or empty. Summarizing based on video title and description.');
        }
      } catch (transcriptError) {
        console.error('Failed to fetch video transcript:', transcriptError);
        // Append to existing error if any, or set new one.
        setError(prevError => prevError ? `${prevError}\nCould not fetch transcript: ${transcriptError.message}` : `Could not fetch transcript: ${transcriptError.message}`);
        setTranscriptNotice('Error fetching transcript. Summarizing based on video title and description.');
        // Do not return; proceed with title/description summary
      }

      console.log('Transcript used for summarization:', !!transcript);

      try {
        const responseText = await geminiApiService.generateContent(geminiApiKey, currentVideoTitle, currentVideoDescription, transcript);
        console.log('Gemini raw response:', responseText);

        let parsedEnglishSummary = 'English summary not found.';
        let parsedArabicSummary = 'Arabic summary not found.';
        let parsedEnglishKeyPoints = ''; // Default to empty string
let parsedEnglishSummary = 'English summary not found.';
let parsedArabicSummary = 'Arabic summary not found.';
let parsedEnglishKeyPoints = 'English key points not found.';
let parsedArabicKeyPoints = 'Arabic key points not found.';

if (transcript && transcript.trim() !== '') {
  // 1. English Summary
  const englishSummaryMatch = responseText.match(/1\.\s*\*\*English Summary\*\*:\s*([\s\S]*?)(?=\n\s*2\.\s*\*\*Arabic Summary\*\*|$)/i);
  if (englishSummaryMatch && englishSummaryMatch[1]) {
    parsedEnglishSummary = englishSummaryMatch[1].trim().replace(/^\{([\s\S]*)\}$/, '$1').trim();
  }

  // 2. Arabic Summary
  const arabicSummaryMatch = responseText.match(/2\.\s*\*\*Arabic Summary\*\*:\s*([\s\S]*?)(?=\n\s*3\.\s*\*\*Key Points in English\*\*|$)/i);
  if (arabicSummaryMatch && arabicSummaryMatch[1]) {
    parsedArabicSummary = arabicSummaryMatch[1].trim().replace(/^\{([\s\S]*)\}$/, '$1').trim();
  }

  // 3. Key Points in English
  const englishKeyPointsMatch = responseText.match(/3\.\s*\*\*Key Points in English\*\*:\s*([\s\S]*?)(?=\n\s*4\.\s*\*{2}النِّقَاط الرَّئِيسِيَّة بِاللُّغَةِ الْعَرَبِيَّة\*{2}|$)/i);
  if (englishKeyPointsMatch && englishKeyPointsMatch[1]) {
    parsedEnglishKeyPoints = englishKeyPointsMatch[1].trim();
  }

  // 4. Arabic Key Points
  const arabicKeyPointsMatch = responseText.match(/4\.\s*\*\*النِّقَاط الرَّئِيسِيَّة بِاللُّغَةِ الْعَرَبِيَّة\*\*:\s*([\s\S]*)/i);
  if (arabicKeyPointsMatch && arabicKeyPointsMatch[1]) {
    parsedArabicKeyPoints = arabicKeyPointsMatch[1].trim();
  }

} else {
  // Fallback if no transcript was used
  parsedEnglishKeyPoints = '';
  parsedArabicKeyPoints = '';
}

            const oldEnglishMatch = responseText.match(/1\.\s*English summary\s*([\s\S]*?)(?=\s*2\.\s*Arabic summary|$)/i);
            if (oldEnglishMatch && oldEnglishMatch[1]) parsedEnglishSummary = oldEnglishMatch[1].trim();

            const oldArabicMatch = responseText.match(/2\.\s*Arabic summary\s*([\s\S]*)/i);
            if (oldArabicMatch && oldArabicMatch[1]) parsedArabicSummary = oldArabicMatch[1].trim();

            // Fallback for very basic non-numbered responses if no transcript
            if (parsedEnglishSummary.includes('not found') && parsedArabicSummary.includes('not found')) {
                 if (responseText.toLowerCase().includes('english summary') && responseText.toLowerCase().includes('arabic summary')) {
                    const arabicSplit = responseText.split(/arabic summary/i);
                    if (arabicSplit.length > 1) {
                        parsedArabicSummary = arabicSplit[1].trim().startsWith(':') ? arabicSplit[1].trim().substring(1).trim() : arabicSplit[1].trim();
                        const englishPart = arabicSplit[0];
                        const englishSplit = englishPart.split(/english summary/i);
                        if (englishSplit.length > 1) {
                             parsedEnglishSummary = englishSplit[1].trim().startsWith(':') ? englishSplit[1].trim().substring(1).trim() : englishSplit[1].trim();
                        } else {
                            parsedEnglishSummary = englishPart.trim();
                        }
                    } else {
                        const englishSplitOnly = responseText.split(/english summary/i);
                         if (englishSplitOnly.length > 1) {
                             parsedEnglishSummary = englishSplitOnly[1].trim().startsWith(':') ? englishSplitOnly[1].trim().substring(1).trim() : englishSplitOnly[1].trim();
                         }
                    }
                }
            }
        }

        setEnglishSummary(parsedEnglishSummary);
        setArabicSummary(parsedArabicSummary);
        setEnglishKeyPoints(parsedEnglishKeyPoints);
        setArabicKeyPoints(parsedArabicKeyPoints);

      } catch (geminiError) {
        console.error('Gemini API Error:', geminiError);
        // Append to existing error if any (e.g. from transcript fetch)
        setError(prevError => prevError ? `${prevError}\nFailed to generate content with Gemini: ${geminiError.message}` : `Failed to generate content with Gemini: ${geminiError.message}`);
      }

    } catch (error) { // Catch errors from video ID extraction or other unexpected issues
      console.error('Summarization Process Error:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Video Summarizer & Topic Extractor</h1>

        <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter Video URL</CardTitle>
          <CardDescription>
            Paste a YouTube video URL below. If available, its transcript will be used for a detailed summary and key topics. Otherwise, title and description will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transcriptNotice && (
            <p className="text-sm text-muted-foreground py-2 px-3 bg-secondary border border-border rounded-md">{transcriptNotice}</p>
          )}
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
          <Button onClick={handleSummarize} disabled={isLoading || !videoUrl.trim()} className="w-full sm:w-auto">
            {isLoading ? 'Summarizing...' : 'Summarize Video'}
          </Button>
        </CardContent>
      </Card>

      { !isLoading && (videoTitle || videoDescription || englishSummary || arabicSummary || englishKeyPoints || arabicKeyPoints || (transcriptNotice && !error) ) && (
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
              <h3 className="font-semibold mb-1 mt-4">English Summary:</h3>
              <p className="text-muted-foreground mb-3 whitespace-pre-wrap">{englishSummary || 'Not generated or not available yet.'}</p>

              <h3 className="font-semibold mb-1 mt-4">Arabic Summary:</h3>
              <p className="text-muted-foreground mb-3 whitespace-pre-wrap" dir="rtl">{arabicSummary || 'Not generated or not available yet.'}</p>

              { (englishKeyPoints || arabicKeyPoints) && (
                <>
                  <h3 className="font-semibold mb-1 mt-4">Key Topics (English):</h3>
                  {englishKeyPoints && englishKeyPoints !== 'English key points not found.' ? (
                    <ul className="list-disc pl-5 text-muted-foreground whitespace-pre-wrap">
                      {englishKeyPoints.split('\n').map((point, index) => {
                        const trimmedPoint = point.replace(/^- /,'').trim(); // Remove leading dashes if present
                        return trimmedPoint && <li key={index}>{trimmedPoint}</li>;
                      })}
                    </ul>
                  ) : <p className="text-muted-foreground">Not generated or not available yet.</p>}

                  <h3 className="font-semibold mb-1 mt-4">Key Topics (Arabic):</h3>
                  {arabicKeyPoints && arabicKeyPoints !== 'Arabic key points not found.' ? (
                    <ul className="list-disc pr-5 text-muted-foreground whitespace-pre-wrap" dir="rtl">
                      {arabicKeyPoints.split('\n').map((point, index) => {
                        const trimmedPoint = point.replace(/^- /,'').trim(); // Remove leading dashes if present
                        return trimmedPoint && <li key={index}>{trimmedPoint}</li>;
                      })}
                    </ul>
                  ) : <p className="text-muted-foreground">Not generated or not available yet.</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}
