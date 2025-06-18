import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText, ListChecks, Zap } from 'lucide-react';

const SummaryDisplaySection = ({ title, content, icon: Icon }) => (
  <div className="mb-4">
    <h3 className="text-lg font-semibold mb-2 flex items-center">
      {Icon && <Icon size={20} className="mr-2 text-primary" />}
      {title}
    </h3>
    {typeof content === 'string' ? (
      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{content || 'Not available.'}</p>
    ) : Array.isArray(content) && content.length > 0 ? (
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
        {content.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">Not available or not applicable.</p>
    )}
  </div>
);

const SummaryTabs = ({ summaryData, videoDetails, transcript, onDownload }) => {
  if (!summaryData) return null;

  const renderSummaryContent = (lang) => {
    const summary = summaryData[lang];
    if (!summary) return <p className="text-center py-4">Summary for {lang.toUpperCase()} is not available.</p>;

    return (
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold">Summary ({lang.toUpperCase()})</h2>
          {onDownload && videoDetails && (
            <Button variant="outline" size="sm" onClick={() => onDownload(lang)}>
              <Download size={16} className="mr-1" /> Download (.txt)
            </Button>
          )}
        </div>

        <SummaryDisplaySection title="Title Summary" content={summary.title_summary} icon={FileText} />
        <SummaryDisplaySection title="Main Topic" content={summary.main_topic} icon={Zap} />
        <SummaryDisplaySection title="Key Points" content={summary.key_points} icon={ListChecks} />
        <SummaryDisplaySection title="Highlights & Insights" content={summary.highlights_insights} icon={Zap} />
        <SummaryDisplaySection title="Overall Sentiment" content={summary.sentiment} icon={Zap} />
      </div>
    );
  };

  return (
    <Tabs defaultValue="ar" className="w-full mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ar">Arabic (العربية)</TabsTrigger>
        <TabsTrigger value="en">English</TabsTrigger>
      </TabsList>
      <TabsContent value="ar">
        {renderSummaryContent('ar')}
      </TabsContent>
      <TabsContent value="en">
        {renderSummaryContent('en')}
      </TabsContent>
    </Tabs>
  );
};

export default SummaryTabs;
