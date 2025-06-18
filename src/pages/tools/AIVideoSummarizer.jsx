import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles, AlertCircle, FileText, Youtube, Languages, CheckCircle, Download, ChevronDown } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import geminiApiService from '@/services/geminiApiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const AIVideoSummarizer = () => {
  const { geminiApiKey, youtubeApiKey } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  const { register, handleSubmit, formState: { errors: formErrors } } = useForm();

  const updateProgress = (value, task) => {
    setProgress(value);
    setCurrentTask(task);
  };

  const getVideoId = (url) => {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v') || url.split('/').pop().split('?')[0];
  };

  const fetchTranscript = async (videoId) => {
    updateProgress(10, 'Fetching available transcripts...');
    try {
      const availableTranscripts = await youtubeApiService.getAvailableTranscripts(videoId);
      if (!availableTranscripts || availableTranscripts.length === 0) {
        throw new Error('No transcripts available for this video.');
      }
      updateProgress(20, 'Selecting best transcript (Arabic or English)...');
      // Prioritize Arabic, then English
      let bestTranscriptMeta = availableTranscripts.find(t => t.languageCode.startsWith('ar'));
      if (!bestTranscriptMeta) {
        bestTranscriptMeta = availableTranscripts.find(t => t.languageCode.startsWith('en'));
      }
      if (!bestTranscriptMeta) {
        throw new Error('No Arabic or English transcript found.');
      }
      updateProgress(30, `Fetching ${bestTranscriptMeta.languageCode} transcript...`);
      const transcriptText = await youtubeApiService.getTranscript(videoId, bestTranscriptMeta.languageCode);
      setTranscript({ text: transcriptText, languageCode: bestTranscriptMeta.languageCode });
      updateProgress(40, 'Transcript fetched successfully.');
      return { text: transcriptText, languageCode: bestTranscriptMeta.languageCode };
    } catch (err) {
      console.error('Transcript fetch error:', err);
      setError(`Transcript Error: ${err.message}. Summarization may proceed without it, or with subtitles if available.`);
      setTranscript(null); // Ensure transcript is null on error
      updateProgress(40, 'Transcript fetch failed or not available.'); // Still count this as progress
      return null; // Return null to indicate failure but allow process to continue
    }
  };

  const summarizeWithGemini = async (textToSummarize, targetLanguage, title) => {
    if (!geminiApiKey) {
      throw new Error('Gemini API Key is not configured.');
    }
    updateProgress(60, `Summarizing text in ${targetLanguage} using Gemini...`);

    const prompt = `
    You are an expert video summarizer. Create a comprehensive summary of the following video transcript.
    The video title is: "${title}".
    The transcript is in ${transcript?.languageCode || 'unknown language (likely English from subtitles)'}.
    Please provide the summary in ${targetLanguage}.

    The summary should include:
    1.  **Main Topic/Purpose:** A concise overview of the video's central theme or objective.
    2.  **Key Points:** A bulleted list of the most important topics, arguments, or information presented.
    3.  **Highlights/Actionable Insights:** (If applicable) Any specific calls to action, key takeaways, or significant moments.
    4.  **Overall Sentiment:** (Optional, if discernible) The general tone or feeling of the video (e.g., positive, critical, informative).

    Transcript:
    ---
    ${textToSummarize}
    ---

    Desired output format (Respond ONLY with the JSON object, no other text or markdown):
    {
      "title_summary": "A brief summary of the video title, if relevant, or rephrased title.",
      "main_topic": "Detailed explanation of the main topic.",
      "key_points": [
        "Key point 1 explained.",
        "Key point 2 explained.",
        "Key point 3 explained."
      ],
      "highlights_insights": [
        "Insight or highlight 1.",
        "Insight or highlight 2."
      ],
      "sentiment": "Positive/Negative/Neutral/Informative etc."
    }
    Ensure the entire response is a single valid JSON object.
    `;

    try {
      const summaryJsonString = await geminiApiService.generateContent(geminiApiKey, prompt, `video_summary_${videoId}_${targetLanguage}`);
      updateProgress(80, 'Processing Gemini response...');
      // Attempt to parse the JSON, cleaning it if necessary
      let cleanedJsonString = summaryJsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      const summary = JSON.parse(cleanedJsonString);
      return summary;
    } catch (err) {
      console.error('Gemini summarization error:', err, "Raw response:", summaryJsonString);
      throw new Error(`Gemini Error: ${err.message}. Raw response was logged. Please ensure the response is valid JSON.`);
    }
  };

  let videoId = ''; // Define videoId in a scope accessible by onSubmit and summarizeWithGemini

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    setSummaryData(null);
    setVideoDetails(null);
    setTranscript(null);
    setProgress(0);
    setCurrentTask('');

    if (!youtubeApiKey) {
      setError('YouTube API Key is not configured.');
      setIsLoading(false);
      return;
    }

    videoId = getVideoId(data.videoUrl); // Assign to the outer scope videoId

    try {
      updateProgress(5, 'Fetching video details...');
      const details = await youtubeApiService.getVideoDetails(videoId);
      if (!details) throw new Error('Could not fetch video details.');
      setVideoDetails(details);

      const fetchedTranscript = await fetchTranscript(videoId);

      let textForSummary = '';
      if (fetchedTranscript) {
        textForSummary = fetchedTranscript.text;
      } else if (details.subtitles && details.subtitles.en) {
        updateProgress(45, 'Using English subtitles for summary as transcript failed.');
        textForSummary = details.subtitles.en; // Fallback to English subtitles
         setTranscript({ text: textForSummary, languageCode: 'en-subs' }); // Mark as subtitles
      } else {
        throw new Error('No transcript or English subtitles available for summarization.');
      }

      if (!textForSummary) {
        throw new Error('Cannot proceed with summarization as no text content (transcript/subtitles) is available.');
      }

      updateProgress(50, 'Preparing for summarization...');
      const summaryAr = await summarizeWithGemini(textForSummary, 'Arabic', details.title);
      updateProgress(85, 'Arabic summary generated. Preparing English summary...');
      const summaryEn = await summarizeWithGemini(textForSummary, 'English', details.title);

      setSummaryData({ ar: summaryAr, en: summaryEn });
      updateProgress(100, 'Summarization complete!');

    } catch (err) {
      console.error('Summarization process error:', err);
      setError(err.message || 'An unknown error occurred during summarization.');
      updateProgress(100, `Failed: ${err.message.substring(0,50)}...`);
    } finally {
      setIsLoading(false);
      // setTimeout(() => setProgress(0), 2000); // Optionally reset progress after a delay
    }
  };

  const downloadSummary = (language) => {
    if (!summaryData || !summaryData[language] || !videoDetails) return;
    const summary = summaryData[language];
    let content = `Video Title: ${videoDetails.title}\n`;
    content += `Video URL: https://www.youtube.com/watch?v=${videoDetails.id}\n\n`;
    content += `Language: ${language.toUpperCase()}\n\n`;
    content += `--- Summary ---\n`;
    content += `Title Summary: ${summary.title_summary || 'N/A'}\n`;
    content += `Main Topic: ${summary.main_topic || 'N/A'}\n\n`;
    content += `Key Points:\n${summary.key_points ? summary.key_points.map(p => `- ${p}`).join('\n') : 'N/A'}\n\n`;
    content += `Highlights/Insights:\n${summary.highlights_insights ? summary.highlights_insights.map(h => `- ${h}`).join('\n') : 'N/A'}\n\n`;
    content += `Sentiment: ${summary.sentiment || 'N/A'}\n\n`;

    if (transcript && transcript.text) {
      content += `--- Transcript (${transcript.languageCode}) ---\n${transcript.text}`;
    } else if (videoDetails && videoDetails.subtitles && videoDetails.subtitles.en && language === 'en') {
        content += `--- Subtitles (English) ---\n${videoDetails.subtitles.en}`;
    }


    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${videoDetails.title.replace(/[^\w\s]/gi, '')}_summary_${language}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-6">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-2">
            <Sparkles size={32} className="text-primary mr-2" />
            <CardTitle className="text-3xl font-bold">AI Video Summarizer</CardTitle>
          </div>
          <CardDescription>
            Get concise summaries of YouTube videos in Arabic and English using Gemini AI.
            Requires YouTube video transcript (auto-captions) or English subtitles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!youtubeApiKey && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>
                YouTube API Key is not configured. Please set it in the application settings.
              </AlertDescription>
            </Alert>
          )}
          {!geminiApiKey && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>
                Gemini API Key is not configured. Please set it in the application settings.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="videoUrl" className="flex items-center mb-1">
                <Youtube size={18} className="mr-2 text-red-600" /> YouTube Video URL
              </Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                {...register('videoUrl', {
                  required: 'Video URL is required.',
                  pattern: {
                    value: /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&\S*)?$/,
                    message: 'Invalid YouTube URL format.'
                  }
                })}
                className={formErrors.videoUrl ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {formErrors.videoUrl && <p className="text-red-500 text-sm mt-1">{formErrors.videoUrl.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !youtubeApiKey || !geminiApiKey}>
              {isLoading ? (
                <>
                  <Sparkles size={18} className="mr-2 animate-pulse" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </form>

          {isLoading && (
            <div className="mt-4">
              <Progress value={progress} className="w-full mb-1" />
              <p className="text-sm text-muted-foreground text-center">{currentTask} ({progress}%)</p>
            </div>
          )}

        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {videoDetails && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Video Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-1">
              <a href={`https://www.youtube.com/watch?v=${videoDetails.id}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={videoDetails.thumbnailUrl}
                  alt={videoDetails.title}
                  className="rounded-lg shadow-md hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
            <div className="md:col-span-2 space-y-1">
              <h3 className="font-semibold text-lg">{videoDetails.title}</h3>
              <p className="text-sm text-muted-foreground">By: {videoDetails.channelTitle}</p>
              <p className="text-sm text-muted-foreground">Duration: {videoDetails.durationFormatted}</p>
              <p className="text-sm text-muted-foreground">Published: {new Date(videoDetails.publishedAt).toLocaleDateString()}</p>
               {transcript && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${transcript.languageCode.startsWith('ar') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        <Languages size={14} className="mr-1" /> {transcript.languageCode.startsWith('ar') ? 'Arabic' : 'English'} Transcript Detected
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Transcript in {transcript.languageCode} successfully loaded.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
               {!transcript && videoDetails.subtitles?.en && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800`}>
                        <Languages size={14} className="mr-1" /> English Subtitles Used
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Transcript fetch failed or not available. Using English subtitles for summarization.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {summaryData && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <FileText size={28} className="mr-2 text-primary" />Generated Summaries
            </CardTitle>
             <CardDescription>Summaries in Arabic and English. Choose your preferred language.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ar" className="flex items-center">
                  <Languages size={16} className="mr-1" /> Arabic (العربية)
                </TabsTrigger>
                <TabsTrigger value="en" className="flex items-center">
                  <Languages size={16} className="mr-1" /> English
                </TabsTrigger>
              </TabsList>

              {['ar', 'en'].map(lang => (
                <TabsContent key={lang} value={lang}>
                  {summaryData[lang] ? (
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Summary ({lang.toUpperCase()})</h3>
                        <Button variant="outline" size="sm" onClick={() => downloadSummary(lang)}>
                          <Download size={16} className="mr-1" /> Download
                        </Button>
                      </div>

                      <Alert className="bg-muted/30">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <AlertTitle className="font-semibold">Title Summary</AlertTitle>
                        <AlertDescription>{summaryData[lang].title_summary || 'Not available.'}</AlertDescription>
                      </Alert>

                      <div>
                        <h4 className="font-semibold mb-1">Main Topic:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{summaryData[lang].main_topic || 'Not available.'}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Key Points:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                          {summaryData[lang].key_points && summaryData[lang].key_points.length > 0 ?
                            summaryData[lang].key_points.map((point, i) => <li key={i}>{point}</li>) :
                            <li>No key points available.</li>
                          }
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Highlights & Insights:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                          {summaryData[lang].highlights_insights && summaryData[lang].highlights_insights.length > 0 ?
                            summaryData[lang].highlights_insights.map((insight, i) => <li key={i}>{insight}</li>) :
                            <li>No highlights or insights available.</li>
                          }
                        </ul>
                      </div>
                       <div>
                        <h4 className="font-semibold mb-1">Sentiment:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{summaryData[lang].sentiment || 'Not available.'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-4">Summary for {lang.toUpperCase()} is not available.</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {transcript && (
                <details className="mt-6 group">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:underline list-none flex items-center">
                        <span className="group-open:hidden">Show Transcript</span>
                        <span className="hidden group-open:inline">Hide Transcript</span>
                        <ChevronDown size={16} className="ml-1 transform group-open:rotate-180 transition-transform" />
                    </summary>
                    <Card className="mt-2">
                        <CardHeader>
                            <CardTitle className="text-base">Video Transcript ({transcript.languageCode})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea value={transcript.text} readOnly rows={10} className="text-xs bg-muted/20" />
                        </CardContent>
                    </Card>
                </details>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIVideoSummarizer;
