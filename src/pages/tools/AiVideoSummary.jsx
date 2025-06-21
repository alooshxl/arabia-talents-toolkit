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

// Helper to wrap English segments in <span dir="ltr"> for Arabic text blocks
const wrapEnglish = (text) => {
  if (!text) return text;
  const parts = text.split(/([A-Za-z0-9][A-Za-z0-9\s.,:;!?']*)/);
  return parts.map((part, i) =>
    /^[A-Za-z0-9]/.test(part) ? <span key={i} dir="ltr">{part}</span> : part
  );
};
// Fetch transcript using the public Piped API which provides CORS headers
async function fetchTranscript(videoUrl, preferredLang) {
  const videoId = (() => {
    try {
      const url = new URL(videoUrl);
      return url.searchParams.get('v') || url.pathname.split('/').pop();
    } catch {
      return videoUrl;
    }
  })();

  const listRes = await fetch(`https://yewtu.be/api/v1/captions/${videoId}`);
  if (!listRes.ok) {
    throw new Error('Transcript list not found');
  }
  const list = await listRes.json();
  const matchLang = preferredLang === 'Arabic' ? 'ar' : preferredLang === 'English' ? 'en' : undefined;
  let track = list.captions.find(c => matchLang && c.languageCode.startsWith(matchLang));
  if (!track) track = list.captions[0];
  if (!track) {
    throw new Error('Transcript unavailable');
  }

  const trackRes = await fetch(`https://yewtu.be${track.url}&fmt=vtt`);
  if (!trackRes.ok) {
    throw new Error('Failed to fetch transcript');
  }
  const vtt = await trackRes.text();
  const lines = [];
  const regex = /^(\d\d:\d\d:\d\d\.\d\d\d) --> .*\n([^\n]+)/gm;
  let m;
  while ((m = regex.exec(vtt)) !== null) {
    lines.push({ time: m[1], text: m[2] });
  }
  return lines;
}

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
      const transcript = await fetchTranscript(videoUrl, language);
      const transcriptText = transcript.map(t => `${t.text} [${t.time}]`).join(' ');
      const langs = language === 'Both' ? ['English', 'Arabic'] : [language];
      const responses = {};
      for (const lang of langs) {
        const prompt = `You are an assistant that summarizes YouTube videos. Using the transcript below, provide a summary in ${lang}. Include 5-7 key points with timestamps and compare the content with this brief: "${brief}". Return ONLY a JSON with fields summary, key_points (array of objects with time and point), and brief_comparison {matches, missing}. Transcript:\n${transcriptText}`;
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
          <CardDescription>Generate summaries and key points from YouTube videos using Arabia Talents AI.</CardDescription>
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
      {result && Object.entries(result).map(([lang, data]) => {
        const isArabic = lang.toLowerCase().startsWith('arabic');
        return (
          <Card key={lang} className="mb-6">
            <CardHeader>
              <CardTitle>Summary ({lang})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p
                  className={`text-sm text-muted-foreground ${isArabic ? 'arabic-text whitespace-pre-line leading-relaxed' : ''}`}
                  dir={isArabic ? 'rtl' : 'ltr'}
                >
                  {isArabic ? wrapEnglish(data.summary) : data.summary}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Key Points</h3>
                <ul
                  className={`list-disc list-inside space-y-1 text-sm text-muted-foreground ${isArabic ? 'arabic-text' : ''}`}
                  dir={isArabic ? 'rtl' : 'ltr'}
                >
                  {data.key_points?.map((kp, i) => (
                    <li key={i}>{isArabic ? wrapEnglish(`${kp.time ? `[${kp.time}] ` : ''}${kp.point}`) : `${kp.time ? `[${kp.time}] ` : ''}${kp.point}`}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Brief Comparison</h3>
                <div className={`text-sm space-y-2 ${isArabic ? 'arabic-text' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                  <div>
                    <p className="font-semibold mb-1">Matches:</p>
                    {Array.isArray(data.brief_comparison?.matches) && data.brief_comparison.matches.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {data.brief_comparison.matches.map((m, i) => (
                          <li key={i}>{isArabic ? wrapEnglish(m) : m}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{data.brief_comparison?.matches || 'None'}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Missing:</p>
                    {Array.isArray(data.brief_comparison?.missing) && data.brief_comparison.missing.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {data.brief_comparison.missing.map((m, i) => (
                          <li key={i}>{isArabic ? wrapEnglish(m) : m}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{data.brief_comparison?.missing || 'None'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
