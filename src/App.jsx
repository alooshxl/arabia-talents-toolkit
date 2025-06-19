import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/layout/Layout';
// import ErrorBoundary from './components/utils/ErrorBoundary'; // Removed
import './App.css';

// Lazy load tool components
import { lazy, Suspense } from 'react';
const Home = lazy(() => import('./pages/Home'));
const ChannelAnalytics = lazy(() => import('./pages/tools/ChannelAnalytics'));
const ChannelComparison = lazy(() => import('./pages/tools/ChannelComparison'));
const BulkChannelAnalyzer = lazy(() => import('./pages/tools/BulkChannelAnalyzer'));
const BulkVideoAnalyzer = lazy(() => import('./pages/tools/BulkVideoAnalyzer'));
const SearchTool = lazy(() => import('./pages/tools/SearchTool'));
const TrendingChecker = lazy(() => import('./pages/tools/TrendingChecker'));
const VideoSummarizer = lazy(() => import('./pages/tools/VideoSummarizer'));
const AIVideoSummarizer = lazy(() => import('./pages/tools/AIVideoSummarizer'));
const AIYTSummarizer = lazy(() => import('./pages/tools/AIYTSummarizer'));
const ArabiaCommentMapper = lazy(() => import('./pages/tools/ArabiaCommentMapper'));
// const LookalikeFinderPage = lazy(() => import('./pages/tools/LookalikeFinderPage')); // Removed
const PubgMiniPage = lazy(() => import('./pages/tools/PubgMiniPage'));

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Main layout routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <Home />
              </Suspense>
            } />
            <Route path="tools/channel-analytics" element={
              <Suspense fallback={<LoadingFallback />}>
                <ChannelAnalytics />
              </Suspense>
            } />
            <Route path="tools/channel-comparison" element={
              <Suspense fallback={<LoadingFallback />}>
                <ChannelComparison />
              </Suspense>
            } />
            <Route path="tools/bulk-channel-analyzer" element={
              <Suspense fallback={<LoadingFallback />}>
                <BulkChannelAnalyzer />
              </Suspense>
            } />
            <Route path="tools/bulk-video-analyzer" element={
              <Suspense fallback={<LoadingFallback />}>
                <BulkVideoAnalyzer />
              </Suspense>
            } />
            <Route path="tools/search-tool" element={
              <Suspense fallback={<LoadingFallback />}>
                <SearchTool />
              </Suspense>
            } />
            <Route path="tools/trending-checker" element={
              <Suspense fallback={<LoadingFallback />}>
                <TrendingChecker />
              </Suspense>
            } />
            <Route path="tools/video-summarizer" element={
              <Suspense fallback={<LoadingFallback />}>
                <VideoSummarizer />
              </Suspense>
            } />
            <Route path="tools/ai-yt-summarizer" element={
              <Suspense fallback={<LoadingFallback />}>
                <AIYTSummarizer />
              </Suspense>
            } />
            <Route path="tools/arabia-comment-mapper" element={
              <Suspense fallback={<LoadingFallback />}>
                <ArabiaCommentMapper />
              </Suspense>
            } />
            {/* Lookalike Finder Route Removed */}
            <Route path="tools/pubgmini" element={
              <Suspense fallback={<LoadingFallback />}>
                <PubgMiniPage />
              </Suspense>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
