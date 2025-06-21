import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { Youtube, Clapperboard } from 'lucide-react';
import geminiApiService from '@/services/geminiApiService';
import { YoutubeTranscript } from 'youtube-transcript';

export default function AiVideoSummary() {
  const { geminiApiKey } = useAppContext();
  const [videoUrl, setVideoUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const summarize = async () => {
    if (!geminiApiKey) {
      setError('Gemini API key is missing.');
      return;
    }
    if (!videoUrl) {
      setError('Please provide a YouTube video URL.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
      const transcriptText = transcript.map(t => `${t.text} [${t.start}]`).join(' ');
      const langs = language === 'Both' ? ['English', 'Arabic'] : [language];
      const responses = {};
      for (const lang of langs) {
        const prompt = `You are an assistant that summarizes YouTube videos. Using the transcript below, provide a summary in ${lang}. Include 5-7 key points with timestamps and compare the content with this brief: \"${brief}\". Return ONLY a JSON with fields summary, key_points (array of objects with time and point), and brief_comparison {matches, missing}. Transcript:\n${transcriptText}`;
        const raw = await geminiApiService.generateContent(geminiApiKey, prompt);
        const cleaned = raw.replace(/```json|```/g, '').trim();
        responses[lang] = JSON.parse(cleaned);
      }
      setResult(responses);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><Clapperboard className="mr-2" />AI Video Summarizer</CardTitle>
          <CardDescription>Generate summaries and key points from YouTube videos using Gemini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="videoUrl" className="flex items-center gap-2"><Youtube size={16}/>Video URL</Label>
            <Input id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Arabic">Arabic</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="brief">Brief (optional)</Label>
            <Textarea id="brief" value={brief} onChange={e=>setBrief(e.target.value)} />
          </div>
          <Button onClick={summarize} disabled={loading}>{loading ? 'Summarizing...' : 'Summarize'}</Button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </CardContent>
      </Card>
      {result && Object.entries(result).map(([lang, data]) => (
        <Card key={lang} className="mb-6">
          <CardHeader>
            <CardTitle>Summary ({lang})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Summary</h3>
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Key Points</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {data.key_points?.map((kp, i) => (
                  <li key={i}>{kp.time ? `[${kp.time}] ` : ''}{kp.point}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Brief Comparison</h3>
              <p className="text-sm"><strong>Matches:</strong> {data.brief_comparison?.matches?.join(', ') || 'None'}</p>
              <p className="text-sm"><strong>Missing:</strong> {data.brief_comparison?.missing?.join(', ') || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
