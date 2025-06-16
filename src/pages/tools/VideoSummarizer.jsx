import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [summary, setSummary] = useState('');
  const [topics, setTopics] = useState('');
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
    setSummary('');
    setTopics('');

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

      const prompt = `Analyze the following YouTube video content. Provide a concise summary in 3-5 bullet points and list 5-7 key topics or keywords discussed.

Video Title: ${currentVideoTitle}

Video Description:
${currentVideoDescription}

Format your response clearly with "Summary:" and "Topics:" sections. For example:
Summary:
- Point 1
- Point 2

Topics:
- Topic 1
- Topic 2`;

      try {
        const responseText = await geminiApiService.generateContent(geminiApiKey, prompt);

        let extractedSummary = 'Could not extract summary from AI response.';
        let extractedTopics = 'Could not extract topics from AI response.';

        const summaryMatch = responseText.match(/Summary:(.*?)Topics:/is);
        if (summaryMatch && summaryMatch[1]) {
            extractedSummary = summaryMatch[1].trim();
            const topicsMatch = responseText.match(/Topics:(.*)/is);
            if (topicsMatch && topicsMatch[1]) {
                extractedTopics = topicsMatch[1].trim();
            } else {
                 // If topics marker is not found after summary, maybe the rest is topics
                const potentialTopics = responseText.substring(summaryMatch[0].length).trim();
                if (potentialTopics) extractedTopics = potentialTopics;
            }
        } else {
            // Fallback if "Summary:" and "Topics:" markers are not distinct
            // Check for summary if it's the only thing
            const simpleSummaryMatch = responseText.match(/Summary:(.*)/is);
            if (simpleSummaryMatch && simpleSummaryMatch[1]) {
                extractedSummary = simpleSummaryMatch[1].trim();
                // Attempt to find topics if summary was the only clear section
                const topicsAfterSummaryMatch = responseText.substring(simpleSummaryMatch[0].length).trim();
                if(topicsAfterSummaryMatch.toLowerCase().startsWith("topics:")) {
                    extractedTopics = topicsAfterSummaryMatch.substring("topics:".length).trim();
                } else if (topicsAfterSummaryMatch) {
                    // If there's text after summary but no "Topics:" marker, assign it to topics or summary
                    // This part can be tricky. For now, let's assume if no clear topic, it might be part of summary or not present.
                    // Or, assign remaining to topics if summary was short
                    if (extractedSummary.length < responseText.length / 2 && topicsAfterSummaryMatch.length > 20) { // Heuristic
                        extractedTopics = topicsAfterSummaryMatch;
                    }
                }
            } else {
                 // If no "Summary:" marker at all, assign whole response to summary
                extractedSummary = responseText;
            }
        }
        setSummary(extractedSummary);
        setTopics(extractedTopics);

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

      { !isLoading && (videoTitle || videoDescription || summary || topics) && (
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
              <h3 className="font-semibold mb-1">Summary:</h3>
              <p className="text-muted-foreground mb-3 whitespace-pre-wrap">{summary || 'Not generated or not available yet.'}</p>
              <h3 className="font-semibold mb-1">Key Topics:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{topics || 'Not generated or not available yet.'}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
