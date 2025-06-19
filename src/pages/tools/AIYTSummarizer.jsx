import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppContext } from '@/contexts/AppContext';
import geminiApiService from '@/services/geminiApiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SummaryLoader from '@/components/summarizer/SummaryLoader';

const AIYTSummarizer = () => {
  const { youtubeApiKey, geminiApiKey } = useAppContext();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const getVideoId = url => {
    try {
      const u = new URL(url);
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      return null;
    } catch {
      return null;
    }
  };

  const onSubmit = async ({ videoUrl }) => {
    const videoId = getVideoId(videoUrl);
    if (!videoId) { setError('Invalid URL'); return; }
    if (!youtubeApiKey || !geminiApiKey) { setError('API keys required'); return; }
    setLoading(true); setError(''); setResult(null); setVideoInfo(null); setTranscript('');
    try {
      const infoRes = await fetch(`/api/video-info?videoId=${videoId}&apiKey=${youtubeApiKey}`);
      const infoData = await infoRes.json();
      if (!infoRes.ok) throw new Error(infoData.error || 'Video info error');
      setVideoInfo(infoData);

      const trRes = await fetch(`/api/transcript?videoId=${videoId}&apiKey=${youtubeApiKey}`);
      const trData = await trRes.json();
      if (!trRes.ok) throw new Error(trData.error || 'Transcript error');
      const plain = trData.transcript.map(t => t.text).join(' ');
      setTranscript(plain);

      const prompt = `Summarize the following Arabic transcript. Provide:\n1. Full summary in English\n2. Full summary in Arabic\n3. 5 to 7 key points with timestamps.\nReturn JSON as {summary_en, summary_ar, points:[{time,text}]}.\nTranscript:\n${trData.transcript.map(e=>e.start+" "+e.text).join("\n")}`;
      const resp = await geminiApiService.generateContent(geminiApiKey, prompt, `yt_sum_${videoId}`);
      const clean = resp.replace(/```json|```/g, '').trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI YT Summarizer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input placeholder="YouTube URL" {...register('videoUrl', { required: true })} />
            {errors.videoUrl && <p className="text-sm text-red-500">URL required</p>}
            <Button type="submit" disabled={loading}>Summarize</Button>
          </form>
        </CardContent>
      </Card>

      {loading && <SummaryLoader progress={50} currentTask="Processing" />}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {videoInfo && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{videoInfo.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 whitespace-pre-wrap">{videoInfo.description}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Summaries</CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-1">English Summary</h4>
            <p className="mb-3 whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded-md">{result.summary_en}</p>
            <h4 className="font-semibold mb-1">Arabic Summary</h4>
            <p className="mb-3 whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded-md">{result.summary_ar}</p>
            <h4 className="font-semibold mb-1">Key Points</h4>
            <ul className="list-disc list-inside space-y-1 text-sm bg-muted/30 p-3 rounded-md">
              {result.points && result.points.map((pt,i)=>(
                <li key={i}>{pt.time} - {pt.text}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {transcript && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Arabic Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={transcript} rows={10} className="text-xs bg-muted/20" />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIYTSummarizer;
