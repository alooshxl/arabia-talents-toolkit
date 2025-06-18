import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as LucideBarChartIcon } from 'lucide-react'; // Placeholder icon

// Assuming ChartContainer and specific content formatters are available from the project's UI kit
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define chart colors, can be moved to a config if shared
const chartColors = {
  sponsored: '#4caf50',       // Green
  nonSponsored: '#f44336',    // Red
  errorOrPending: '#ffc107', // Amber
};

const chartConfigForSummary = {
  sponsored: { label: "Sponsored", color: chartColors.sponsored },
  nonSponsored: { label: "Non-Sponsored", color: chartColors.nonSponsored },
  errorOrPending: { label: "Error/Pending", color: chartColors.errorOrPending },
};


const SummaryDisplay = ({ analyzedVideos }) => {
  const { totalAnalyzed, totalSponsored, topAdvertisersString } = useMemo(() => {
    if (!analyzedVideos || analyzedVideos.length === 0) {
      return { totalAnalyzed: 0, totalSponsored: 0, topAdvertisersString: 'N/A' };
    }

    const sponsoredVideos = analyzedVideos.filter(v => v.isSponsored === true);
    const totalSponsoredCount = sponsoredVideos.length;

    const advertiserCounts = sponsoredVideos.reduce((acc, video) => {
      if (video.advertiserName && video.advertiserName !== 'N/A (Manual)') {
        acc[video.advertiserName] = (acc[video.advertiserName] || 0) + 1;
      }
      return acc;
    }, {});

    const sortedAdvertisers = Object.entries(advertiserCounts)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .slice(0, 3) // Top 3 advertisers
      .map(([name, count]) => `${name} (${count})`);

    const topAdvString = sortedAdvertisers.length > 0 ? sortedAdvertisers.join(', ') : 'N/A';

    return {
      totalAnalyzed: analyzedVideos.length,
      totalSponsored: totalSponsoredCount,
      topAdvertisersString: topAdvString,
    };
  }, [analyzedVideos]);

  const chartData = useMemo(() => {
    if (!analyzedVideos || analyzedVideos.length === 0) return [];

    const sponsoredCount = totalSponsored; // Already calculated
    const nonSponsoredCount = analyzedVideos.filter(v => v.isSponsored === false && !v.analysisError).length;
    const errorCount = analyzedVideos.filter(v => v.analysisError || (v.isSponsored === undefined && !v.analysisError)).length; // Error or Pending (not yet analyzed but no error)

    const data = [];
    if (sponsoredCount > 0) data.push({ name: 'Sponsored', count: sponsoredCount, fill: chartColors.sponsored });
    if (nonSponsoredCount > 0) data.push({ name: 'Non-Sponsored', count: nonSponsoredCount, fill: chartColors.nonSponsored });
    if (errorCount > 0) data.push({ name: 'Error/Pending', count: errorCount, fill: chartColors.errorOrPending });

    return data;
  }, [analyzedVideos, totalSponsored]);

  return (
    <Card>
      <CardHeader><CardTitle>Analysis Summary</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p>Total Videos Analyzed: <span className="font-semibold">{totalAnalyzed}</span></p>
          <p>Sponsored Videos Found: <span className="font-semibold">{totalSponsored}</span></p>
          <p>Top Advertisers: <span className="font-semibold">{topAdvertisersString}</span></p>
        </div>

        {totalAnalyzed > 0 && chartData.length > 0 ? (
          <div className="h-[250px] mt-4">
            <ChartContainer config={chartConfigForSummary} className="w-full h-full">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : totalAnalyzed > 0 && chartData.length === 0 ? (
             <div className="p-4 border rounded-md text-center bg-muted/30 h-[250px] flex flex-col justify-center items-center">
                <LucideBarChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No data to display chart (e.g. all videos resulted in errors or pending).</p>
            </div>
        ) : (
          <div className="p-4 border rounded-md text-center bg-muted/30 h-[250px] flex flex-col justify-center items-center">
            <LucideBarChartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No analysis data available to summarize. Perform analysis first.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default SummaryDisplay;
