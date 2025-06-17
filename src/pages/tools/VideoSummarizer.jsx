import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const [englishSummary, setEnglishSummary] = useState('');
  const [arabicSummary, setArabicSummary] = useState('');
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
    setEnglishSummary('');
    setArabicSummary('');

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

      // Simplified prompt, as the detailed structure is in geminiApiService now
      const prompt = `Video Title: ${currentVideoTitle}

Video Description:
${currentVideoDescription}`;

      try {
        const responseText = await geminiApiService.generateContent(geminiApiKey, prompt);

        let parsedEnglishSummary = 'English summary not found in response.';
        let parsedArabicSummary = 'Arabic summary not found in response.';

        // Regex to find "1. English summary" followed by its content,
        // until "2. Arabic summary" or end of string.
        const englishMatch = responseText.match(/1\.\s*English summary\s*([\s\S]*?)(?=\s*2\.\s*Arabic summary|$)/i);
        if (englishMatch && englishMatch[1]) {
          parsedEnglishSummary = englishMatch[1].trim();
        }

        // Regex to find "2. Arabic summary" followed by its content.
        const arabicMatch = responseText.match(/2\.\s*Arabic summary\s*([\s\S]*)/i);
        if (arabicMatch && arabicMatch[1]) {
          parsedArabicSummary = arabicMatch[1].trim();
        }

        // A simple fallback if the numbered list isn't matched perfectly but the headers might be there:
        if (parsedEnglishSummary.includes('not found') && parsedArabicSummary.includes('not found')) {
            if (responseText.toLowerCase().includes('english summary') && responseText.toLowerCase().includes('arabic summary')) {
                 // This is a very basic fallback, might need more sophisticated logic
                 // if Gemini's output varies a lot without strict numbering.
                 // For now, it acknowledges that the response might exist but wasn't parsed by primary regex.
                 // Consider splitting based on "Arabic Summary" and then cleaning up "English Summary" part.
                const arabicSplit = responseText.split(/arabic summary/i);
                if (arabicSplit.length > 1) {
                    parsedArabicSummary = arabicSplit[1].trim().startsWith(':') ? arabicSplit[1].trim().substring(1).trim() : arabicSplit[1].trim();
                    const englishPart = arabicSplit[0];
                    const englishSplit = englishPart.split(/english summary/i);
                    if (englishSplit.length > 1) {
                         parsedEnglishSummary = englishSplit[1].trim().startsWith(':') ? englishSplit[1].trim().substring(1).trim() : englishSplit[1].trim();
                    } else {
                        parsedEnglishSummary = englishPart.trim(); // Might contain "English Summary" header
                    }
                } else {
                    // If no "Arabic Summary", maybe whole thing is English or unparseable
                    const englishSplitOnly = responseText.split(/english summary/i);
                     if (englishSplitOnly.length > 1) {
                         parsedEnglishSummary = englishSplitOnly[1].trim().startsWith(':') ? englishSplitOnly[1].trim().substring(1).trim() : englishSplitOnly[1].trim();
                     } else {
                        // If neither specific header is found, assign whole response to English summary as a last resort.
                        // parsedEnglishSummary = responseText; // Or keep 'not found'
                     }
                }
            }
        }


        setEnglishSummary(parsedEnglishSummary);
        setArabicSummary(parsedArabicSummary);

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
          <Button onClick={handleSummarize} disabled={isLoading || !videoUrl.trim()} className="w-full sm:w-auto">
            {isLoading ? 'Summarizing...' : 'Summarize Video'}
          </Button>
        </CardContent>
      </Card>

      { !isLoading && (videoTitle || videoDescription || englishSummary || arabicSummary) && (
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
            <CardHeader><CardTitle>AI Generated Summaries</CardTitle></CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-1 mt-4">English Summary:</h3>
              <p className="text-muted-foreground mb-3 whitespace-pre-wrap">{englishSummary || 'Not generated or not available yet.'}</p>
              <h3 className="font-semibold mb-1 mt-4">Arabic Summary:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" dir="rtl">{arabicSummary || 'Not generated or not available yet.'}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
