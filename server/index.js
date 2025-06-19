import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

function parseSrt(text) {
  const entries = [];
  const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    entries.push({ start: match[2], end: match[3], text: match[4].replace(/\n/g, ' ').trim() });
  }
  return entries;
}

app.get('/api/video-info', async (req, res) => {
  const { videoId, apiKey } = req.query;
  if (!videoId || !apiKey) return res.status(400).json({ error: 'Missing videoId or apiKey' });
  const url = `${YT_BASE}/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    if (!data.items || data.items.length === 0) return res.status(404).json({ error: 'Video not found' });
    const item = data.items[0].snippet;
    res.json({ title: item.title, description: item.description });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/transcript', async (req, res) => {
  const { videoId, apiKey } = req.query;
  if (!videoId || !apiKey) return res.status(400).json({ error: 'Missing videoId or apiKey' });
  const listUrl = `${YT_BASE}/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  try {
    const listResp = await fetch(listUrl);
    if (!listResp.ok) return res.status(listResp.status).json({ error: await listResp.text() });
    const listData = await listResp.json();
    const tracks = listData.items || [];
    const track = tracks.find(t => t.snippet.language === 'ar');
    if (!track) return res.status(404).json({ error: 'Arabic transcript not found' });
    const captionId = track.id;
    const downloadUrl = `${YT_BASE}/captions/${captionId}?tfmt=srt&key=${apiKey}`;
    const dlResp = await fetch(downloadUrl);
    if (!dlResp.ok) return res.status(dlResp.status).json({ error: await dlResp.text() });
    const srt = await dlResp.text();
    const transcript = parseSrt(srt);
    res.json({ transcript });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('API server running on', PORT));
