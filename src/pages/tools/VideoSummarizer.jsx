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
  const [summary, setSummary] = useState('');
  const [topics, setTopics] = useState('');
  const [userBrief, setUserBrief] = useState('');
  const [briefComparisonResult, setBriefComparisonResult] = useState('');
  const [enhancedSummary, setEnhancedSummary] = useState({ mainTopics: '', subtopics: '', mentions: '', timeline: '' });
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
    setBriefComparisonResult('');
    setEnhancedSummary({ mainTopics: '', subtopics: '', mentions: '', timeline: '' });
    // userBrief is intentionally not reset here as it's a user input

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
        const responseText = await geminiApiService.generateContent(geminiApiKey, prompt, userBrief);

        // Helper function to extract content based on markers
        const extractSection = (text, marker) => {
          // Regex: marker, then any characters (non-greedy), until next marker or end of string.
          // Next marker is assumed to be two newlines then a word starting with a capital letter, followed by a colon.
          // Or, end of string ($).
          const regex = new RegExp(`^${marker}\\s*(.*?)(?=\\n\\n[A-Z][a-z\\s]*:|$)`, 'ims');
          const match = text.match(regex);
          return match && match[1] ? match[1].trim() : 'Not found in response.';
        };

        // Fallback for older summary/topics if new ones are not found
        const extractOldSection = (text, marker, endMarker = null) => {
            const endMarkerPattern = endMarker ? `(?=\\n\\n${endMarker})` : '$';
            const regex = new RegExp(`^${marker}\\s*(.*?)${endMarkerPattern}`, 'ims');
            const match = text.match(regex);
            return match && match[1] ? match[1].trim() : null;
        };


        if (userBrief && userBrief.trim() !== '') {
          const parsedEnhancedSummary = extractSection(responseText, 'Enhanced Summary:');
          const parsedMainTopics = extractSection(responseText, 'Main Topics:');
          const parsedSubtopics = extractSection(responseText, 'Subtopics:');
          const parsedMentions = extractSection(responseText, 'Mentions:');
          const parsedTimeline = extractSection(responseText, 'Timeline:');
          const parsedBriefComparison = extractSection(responseText, 'Brief Comparison:');

          setSummary(parsedEnhancedSummary);
          // Set topics to main topics for the "Key Topics" display, and also within enhancedSummary
          setTopics(parsedMainTopics);
          setBriefComparisonResult(parsedBriefComparison);
          setEnhancedSummary({
            mainTopics: parsedMainTopics,
            subtopics: parsedSubtopics,
            mentions: parsedMentions,
            timeline: parsedTimeline,
          });
        } else {
          // Original parsing logic if no userBrief was provided
          let extractedSummary = 'Could not extract summary from AI response.';
          let extractedTopics = 'Could not extract topics from AI response.';

          // Try to parse Summary: ... Topics: ...
          const summaryMatch = responseText.match(/Summary:(.*?)Topics:/is);
          if (summaryMatch && summaryMatch[1]) {
              extractedSummary = summaryMatch[1].trim();
              const topicsMatchText = responseText.substring(summaryMatch[0].length); // Text after "Summary:...Topics:"
              const topicsMatch = topicsMatchText.match(/Topics:(.*)/is);
              if (topicsMatch && topicsMatch[1]) {
                  extractedTopics = topicsMatch[1].trim();
              } else {
                  extractedTopics = topicsMatchText.trim(); // Assume rest is topics if "Topics:" marker is there but content is tricky
              }
          } else {
              // Fallback if "Summary:" and "Topics:" markers are not distinct or "Topics:" is missing
              const simpleSummaryMatch = responseText.match(/Summary:(.*)/is);
              if (simpleSummaryMatch && simpleSummaryMatch[1]) {
                  extractedSummary = simpleSummaryMatch[1].trim();
                  // Attempt to find topics if summary was the only clear section
                  const potentialTopics = responseText.substring(simpleSummaryMatch[0].length).trim();
                  if (potentialTopics.toLowerCase().startsWith("topics:")) {
                      extractedTopics = potentialTopics.substring("topics:".length).trim();
                  } else if (potentialTopics.length > 20) { // Heuristic: if there's significant text after summary
                      extractedTopics = potentialTopics;
                  } else {
                      extractedTopics = "Topics not clearly separated or found."
                  }
              } else {
                   // If no "Summary:" marker at all, assign whole response to summary
                  extractedSummary = responseText;
                  extractedTopics = "Topics not found.";
              }
          }
          setSummary(extractedSummary);
          setTopics(extractedTopics);
          // Clear other fields that are not applicable when no brief is used
          setBriefComparisonResult('');
          setEnhancedSummary({ mainTopics: '', subtopics: '', mentions: '', timeline: '' });
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
            <Label htmlFor="userBriefInput">Your Brief/Key Points</Label>
            <Textarea
              id="userBriefInput"
              placeholder="Enter the key points or aspects you expect the video to cover..."
              value={userBrief}
              onChange={(e) => setUserBrief(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSummarize} disabled={isLoading || !videoUrl.trim()} className="w-full sm:w-auto">
            {isLoading ? 'Summarizing...' : 'Summarize Video'}
          </Button>
        </CardContent>
      </Card>

      { !isLoading && (videoTitle || videoDescription || summary || topics || briefComparisonResult || enhancedSummary.mainTopics || enhancedSummary.subtopics ) && (
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

          <Card>
            <CardHeader><CardTitle>Brief Comparison</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{briefComparisonResult || 'Not generated or not available yet.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enhanced Summary Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h4 className="font-semibold">Main Topics:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{enhancedSummary.mainTopics || 'Not generated or not available yet.'}</p>
              </div>
              <div>
                <h4 className="font-semibold">Subtopics:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{enhancedSummary.subtopics || 'Not generated or not available yet.'}</p>
              </div>
              <div>
                <h4 className="font-semibold">Mentions:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{enhancedSummary.mentions || 'Not generated or not available yet.'}</p>
              </div>
              <div>
                <h4 className="font-semibold">Timeline:</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{enhancedSummary.timeline || 'Not generated or not available yet.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
