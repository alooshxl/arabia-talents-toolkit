import { useState, useCallback } from 'react';
import geminiApiService from '@/services/geminiApiService';

// --- Helper: Gemini Response Parser ---
function parseGeminiResponse(responseText) {
  const result = {
    isSponsored: false,
    advertiserName: '',
    productOrService: '',
    detectedKeywords: '',
    error: null
  };
  if (!responseText || typeof responseText !== 'string') {
    result.error = 'Empty or invalid Gemini response';
    return result;
  }

  // Normalize line endings that Gemini might produce
  const normalizedText = responseText.replace(/(\r\n|\r|\n)/g, '\n');

  if (normalizedText.toLowerCase().includes("not sponsored")) {
    return result;
  }

  let sponsoredText = (normalizedText.match(/\*\*(?:Sponsored|مدعوم):\*\*\s*(نعم|لا)/i) || [])[1];
  if (!sponsoredText) {
      sponsoredText = (normalizedText.match(/\*\*(?:Sponsored|مدعوم):\*\*\s*(yes|no)/i) || [])[1];
  }

  if (sponsoredText && (sponsoredText.toLowerCase() === 'نعم' || sponsoredText.toLowerCase() === 'yes')) {
    result.isSponsored = true;
  }

  result.productOrService = (normalizedText.match(/\*\*(?:الإعلان عن|Product\/Service):\*\*\s*(.+)/i) || [])[1]?.trim() || '';
  result.advertiserName = (normalizedText.match(/\*\*(?:اسم المعلن|Advertiser Name):\*\*\s*(.+)/i) || [])[1]?.trim() || '';
  result.detectedKeywords = (normalizedText.match(/\*\*(?:الكلمات الدالة|Keywords):\*\*\s*(.+)/i) || [])[1]?.trim() || '';

  // If not explicitly marked as sponsored, but other fields are filled, do NOT infer sponsorship.
  // This was a point of discussion in the prompt, deciding to rely on explicit "Sponsored: نعم/Yes".
  // If no fields were parsed and it wasn't "Not sponsored", it implies a parsing issue or unexpected format.
  if (!result.isSponsored && !result.productOrService && !result.advertiserName && !result.detectedKeywords && !normalizedText.toLowerCase().includes("not sponsored")) {
      // This condition means nothing was extracted and it wasn't explicitly non-sponsored.
      // It could be an unexpected format from Gemini.
      // result.error = "Could not parse Gemini response or response format unexpected.";
      // Keeping it as not sponsored if explicit "Sponsored: Yes" is missing.
  }

  return result;
}

// --- Helper: Manual Keyword Analysis ---
const manualKeywordsList = [
    '#إعلان', '#اعلان', 'إعلان مدفوع', 'اعلان مدفوع',
    'برعاية',
    'sponsored by',
    'advertisement',
    '#ad',
    'محتوى مدفوع',
    'يتضمن الترويج المدفوع', 'paid promotion',
    'مراجعة مدفوعة', 'paid review',
    'discount code', 'كود خصم',
    'promo code', 'برومو كود', 'coupon code',
    'affiliate link', 'affiliation',
    'بالتعاون مع', 'in collaboration with',
    'بالشراكة مع', 'in partnership with',
    'بتمويل من', 'funded by',
    'مقدم من', 'presented by'
];

function manualKeywordAnalysis(description) {
  const result = { isSponsored: false, productOrService: 'N/A (Manual)', advertiserName: 'N/A (Manual)', detectedKeywords: '', error: null };
  if (!description || typeof description !== 'string') {
    result.error = 'Empty or invalid description for manual analysis.';
    return result;
  }
  const lowerDesc = description.toLowerCase();
  for (const keyword of manualKeywordsList) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      result.isSponsored = true;
      result.detectedKeywords = keyword;
      break;
    }
  }
  return result;
}

// --- Gemini Prompt ---
const GEMINI_PROMPT_TEMPLATE = `You are an expert content analyst. Analyze the following YouTube video description and determine if it contains any form of **sponsorship, advertisement, or brand promotion**, especially those targeting Arabic-speaking audiences.

Description:
---
{videoDescription}
---

Your tasks:

1. Determine if this video is **sponsored or contains an advertisement**. The ad may be written in Arabic, English, or a mix of both.

2. If it is sponsored:
   - What kind of product/service is being advertised? (e.g., mobile game, app, clothing brand)
   - What is the **name of the brand or advertiser**, if known?
   - What are the **keywords, hashtags, or phrases** that indicate sponsorship? (e.g., #إعلان, رابط التحميل, Sponsored by X)

3. If there is no clear sign of sponsorship, just say: "Not sponsored."

Respond in **Arabic** if the description is primarily Arabic. Use this format strictly:

**Sponsored:** نعم / لا
**الإعلان عن:** {نوع المنتج أو الخدمة}
**اسم المعلن:** {اسم المعلن إن وجد}
**الكلمات الدالة:** {كلمات أو عبارات رُصدت}`;

const useVideoAnalysis = (initialGeminiApiKey) => {
  const [analyzedVideosList, setAnalyzedVideosList] = useState([]);
  const [isCurrentlyAnalyzing, setIsCurrentlyAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(initialGeminiApiKey);

  const updateGeminiApiKey = useCallback((newApiKey) => {
    setGeminiApiKey(newApiKey);
    // The geminiApiService itself does not have a global setApiKey method.
    // The key is passed directly to its generateContent method.
    // This function primarily updates the key for this hook's context.
  }, []);

  const performVideoAnalysis = useCallback(async (videosToAnalyze, shouldUseGemini) => {
    if (!videosToAnalyze || videosToAnalyze.length === 0) {
        setAnalyzedVideosList([]);
        setIsCurrentlyAnalyzing(false);
        return;
    }
    if (shouldUseGemini && (!geminiApiKey && !geminiApiService.getApiKey?.())) { // Check hook's key or service's key
      setAnalysisError('Gemini API key is not set.');
      setIsCurrentlyAnalyzing(false);
      setAnalyzedVideosList(videosToAnalyze.map(v => ({...v, analysisError: 'API Key Missing'})));
      return;
    }

    setIsCurrentlyAnalyzing(true);
    setAnalysisError(null);
    // Initialize with original video data, to be progressively updated
    setAnalyzedVideosList(videosToAnalyze.map(v => ({...v})));

    const results = [];
    for (let i = 0; i < videosToAnalyze.length; i++) {
      const video = videosToAnalyze[i];
      let currentAnalysis = {
        isSponsored: false,
        advertiserName: '',
        productOrService: '',
        detectedKeywords: '',
        analysisError: null
      };

      try {
        if (shouldUseGemini) {
          const prompt = GEMINI_PROMPT_TEMPLATE.replace('{videoDescription}', video.description || '');
          // Use the key from the hook's state, which might have been updated by updateGeminiApiKey.
          // Fallback to service's getApiKey if the hook's one isn't set (e.g. on initial load before useEffect runs in page)
          const keyForApiCall = geminiApiKey || geminiApiService.getApiKey?.();
          if (!keyForApiCall) throw new Error("Gemini API key not available for call.");

          const responseText = await geminiApiService.generateContent(keyForApiCall, prompt, `sponsored_checker_${video.id}`);
          const parsed = parseGeminiResponse(responseText);
          currentAnalysis = { ...currentAnalysis, ...parsed, analysisError: parsed.error };
          if (i < videosToAnalyze.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          const manualResult = manualKeywordAnalysis(video.description || '');
          currentAnalysis = { ...currentAnalysis, ...manualResult, analysisError: manualResult.error };
        }
      } catch (err) {
        console.error(`Error analyzing video ${video.id}:`, err);
        currentAnalysis.analysisError = err.message || 'Analysis failed for this video.';
      }
      results.push({ ...video, ...currentAnalysis });
      // Incremental update for better UX
      setAnalyzedVideosList([...results, ...videosToAnalyze.slice(i + 1).map(v => ({...v}))]);
    }
    // setAnalyzedVideosList(results); // Final update (already done incrementally)
    setIsCurrentlyAnalyzing(false);
  }, [geminiApiKey]);

  return { analyzedVideosList, isCurrentlyAnalyzing, analysisError, performVideoAnalysis, updateGeminiApiKey, setAnalysisError };
};

export default useVideoAnalysis;
