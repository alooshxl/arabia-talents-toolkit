import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
// Checkbox component is not directly used in the Command for selection, CommandItem handles it.
// import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, Download } from "lucide-react"; // Added Download
import { cn } from "@/lib/utils";

import youtubeApiService from '@/services/youtubeApi';
import { Skeleton } from '@/components/ui/skeleton';
// import { Users, Search as SearchIcon, AlertTriangle, CheckCircle } from 'lucide-react'; // Example icons

const menaCountries = [
  { value: 'SA', label: 'Saudi Arabia' }, { value: 'AE', label: 'UAE' },
  { value: 'EG', label: 'Egypt' }, { value: 'IQ', label: 'Iraq' },
  { value: 'JO', label: 'Jordan' }, { value: 'KW', label: 'Kuwait' },
  { value: 'LB', label: 'Lebanon' }, { value: 'OM', label: 'Oman' },
  { value: 'QA', label: 'Qatar' }, { value: 'BH', label: 'Bahrain' },
  { value: 'MA', label: 'Morocco' }, { value: 'DZ', label: 'Algeria' },
  { value: 'TN', label: 'Tunisia' }, { value: 'YE', label: 'Yemen' },
  { value: 'PS', label: 'Palestine' }, { value: 'LY', label: 'Libya' },
  { value: 'SD', label: 'Sudan' }
];

export default function LookalikeFinderPage() {
  const [channelInput, setChannelInput] = useState('');
  const [numChannels, setNumChannels] = useState([20]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [sortBy, setSortBy] = useState('subscribers');

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openCountrySelector, setOpenCountrySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function (can be moved to utils)
  const formatSubscribers = (count) => {
    if (count === undefined || count === null) return 'N/A';
    const num = parseInt(count, 10);
    if (Number.isNaN(num)) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleFindChannels = async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      if (!channelInput.trim()) {
        setError('Please enter a YouTube channel URL or ID.');
        setIsLoading(false);
        return;
      }

      const resolvedChannelId = await youtubeApiService.resolveChannelId(channelInput);
      // resolveChannelId throws an error if it fails, so no need to check !resolvedChannelId

      // Optional: Fetch and display info of the source channel (can be added later)
      // const sourceChannelInfo = await youtubeApiService.getChannelInfo(resolvedChannelId);
      // console.log("Source Channel:", sourceChannelInfo);

      const relatedChannelsDataArray = await youtubeApiService.findRelatedChannels(resolvedChannelId, numChannels[0]);

      if (!relatedChannelsDataArray || relatedChannelsDataArray.length === 0) {
        // No error, but no results. The results display section will handle this.
        setIsLoading(false);
        return;
      }

      // Enrich channels with full details (subscriber count, country etc.)
      // relatedChannelsDataArray is an array of {id, frequency}
      const enrichedChannelsPromises = relatedChannelsDataArray.map(async (channelStub) => {
        try {
          const channelInfo = await youtubeApiService.getChannelInfo(channelStub.id);
          return { ...channelInfo, frequency: channelStub.frequency }; // Combine full info with frequency
        } catch (err) {
          console.warn(`Failed to fetch info for channel ${channelStub.id}:`, err);
          // Return null or a specific structure to indicate failure for this item,
          // which will be filtered out by successfullyEnrichedChannels logic.
          // Or re-throw if Promise.allSettled is to catch it as 'rejected'.
          // For allSettled, it's better to let it capture the actual error.
          throw err;
        }
      });

      const settledResults = await Promise.allSettled(enrichedChannelsPromises);

      const successfullyEnrichedChannels = settledResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      // Log any channels that failed enrichment for debugging
      settledResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Enrichment failed for channel ID ${relatedChannelsDataArray[index]?.id}:`, result.reason);
        }
      });

      setResults(successfullyEnrichedChannels);

    } catch (err) {
      console.error("Error finding channels:", err);
      setError(err.message || 'An unexpected error occurred. Check API key and input.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedResults = useMemo(() => {
    let processedResults = [...results];

    // Apply country filter
    if (selectedCountries.length > 0) {
      processedResults = processedResults.filter(channel =>
        channel.snippet.country && selectedCountries.includes(channel.snippet.country)
      );
    }

    // Apply sorting
    if (sortBy === 'subscribers') {
      processedResults.sort((a, b) => (parseInt(b.statistics?.subscriberCount || 0) - parseInt(a.statistics?.subscriberCount || 0)));
    } else if (sortBy === 'alphabetical') {
      processedResults.sort((a, b) => a.snippet.title.localeCompare(b.snippet.title));
    } else if (sortBy === 'similarity') {
      processedResults.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    }

    // Apply live search filter
    let finalFilteredResults = [...processedResults];
    if (searchQuery.trim() !== '') {
      finalFilteredResults = processedResults.filter(channel =>
        channel.snippet.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const calculatedReach = finalFilteredResults.reduce((acc, channel) => acc + parseInt(channel.statistics?.subscriberCount || 0), 0);

    return {
      channels: finalFilteredResults,
      totalReach: calculatedReach,
      filteredCount: finalFilteredResults.length
    };
  }, [results, selectedCountries, sortBy, searchQuery]);

  const handleExportCsv = () => {
    if (!displayedResults.channels || displayedResults.channels.length === 0) return;

    const headers = ['Channel Name', 'Channel ID', 'Subscribers', 'Country'];
    const csvRows = [
      headers.join(','),
      ...displayedResults.channels.map(channel => [
        `"${channel.snippet.title.replace(/"/g, '""')}"`,
        channel.id,
        channel.statistics?.subscriberCount || 0,
        channel.snippet.country || 'N/A'
      ].join(','))
    ];
    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'lookalike_channels.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Verified badge check - assuming 'channel.brandingSettings.channel.showVerifiedBadge' was the path.
  // However, this is often not populated or deprecated. For this exercise, we'll simulate its check.
  // In a real scenario, ensure this data point is reliably fetched via API if critical.
  // For now, as per instructions, we will not add new API calls.
  // So, the verified badge display will be omitted or use a placeholder logic if any.
  // Based on current `getChannelInfo` (snippet, statistics, brandingSettings), a reliable verified status is unlikely.
  // So, this feature will be noted as skipped due to data unavailability from current calls.

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Lookalike Audience Finder</h1>
        <p className="text-muted-foreground">
          Find YouTube channels similar to a given channel, with filters for MENA countries.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Enter a YouTube channel URL or ID and set your preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel-url">Channel URL or ID</Label>
              <Input
                id="channel-url"
                placeholder="e.g., https://www.youtube.com/channel/UCxxxx or UCxxxx"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-channels">Number of Channels to Fetch (5-50)</Label>
              <Slider
                id="num-channels"
                min={5}
                max={50}
                step={1}
                value={numChannels}
                onValueChange={setNumChannels}
              />
              <p className="text-sm text-muted-foreground text-center">{numChannels[0]} channels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country Filter (MENA)</Label>
              <Popover open={openCountrySelector} onOpenChange={setOpenCountrySelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCountrySelector}
                    className="w-full justify-between"
                  >
                    {selectedCountries.length > 0
                      ? selectedCountries.length === 1
                        ? menaCountries.find(c => c.value === selectedCountries[0])?.label
                        : `${selectedCountries.length} countries selected`
                      : "Select countries..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {menaCountries.map((country) => (
                          <CommandItem
                            key={country.value}
                            value={country.label} // Value for search functionality
                            onSelect={() => {
                              const valueUpper = country.value.toUpperCase();
                              setSelectedCountries(prev =>
                                prev.includes(valueUpper)
                                  ? prev.filter(c => c !== valueUpper)
                                  : [...prev, valueUpper]
                              );
                              // setOpenCountrySelector(false); // Keep popover open for multi-selection
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCountries.includes(country.value) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedCountries.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {selectedCountries.map(c => menaCountries.find(mc => mc.value === c)?.label || c).join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort Results By</Label>
              <Select id="sort-by" value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sorting option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribers">Subscribers (High to Low)</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                  <SelectItem value="similarity">Similarity Score (If applicable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleFindChannels}>
              {/* <SearchIcon className="mr-2 h-4 w-4" /> Find Channels */}
              Find Channels
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <CardTitle>Results</CardTitle>
              {displayedResults.channels && displayedResults.channels.length > 0 && (
                 <Button variant="outline" onClick={handleExportCsv} disabled={!displayedResults.channels || displayedResults.channels.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Export to CSV
                </Button>
              )}
            </div>
            <CardDescription>
              {displayedResults.channels && displayedResults.filteredCount > 0 ? (
                `Showing ${displayedResults.filteredCount} similar channel(s). Total Estimated Reach: ${formatSubscribers(displayedResults.totalReach)} subscribers.`
              ) : (
                !isLoading && results.length > 0 && selectedCountries.length === 0 && !searchQuery ? 'Similar channels will be displayed below.' : ''
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 && !isLoading && ( // Show search only if there are initial results and not loading
            <div className="mb-4">
              <Input
                placeholder="Filter results by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-1/2 lg:w-1/3"
              />
            </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(numChannels[0])].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="items-center text-center">
                      <Skeleton className="w-20 h-20 rounded-full" />
                      <Skeleton className="h-5 w-3/4 mt-2" />
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                      <Skeleton className="h-3 w-1/3 mx-auto" />
                      <Skeleton className="h-8 w-24 mx-auto mt-3" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md text-center">
                {/* <AlertTriangle className="inline mr-2 h-5 w-5" /> */}
                <strong>Error:</strong> {error}
              </div>
            )}

            {!isLoading && !error && displayedResults.filteredCount === 0 && (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  {isLoading ? "Loading..." :
                    searchQuery ? "No channels match your search query." :
                    (results.length > 0 && (selectedCountries.length > 0 || searchQuery))
                    ? "No channels match the current filters."
                    : "No channels found yet. Configure your search and click \"Find Channels\", or try different criteria if your search returned no results."
                  }
                </p>
              </div>
            )}

            {!isLoading && !error && displayedResults.channels && displayedResults.filteredCount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedResults.channels.map(channel => (
                  <Card key={channel.id} className="flex flex-col">
                    <CardHeader className="items-center text-center">
                      <img
                        src={channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url}
                        alt={`${channel.snippet.title} thumbnail`}
                        className="w-20 h-20 rounded-full mx-auto border shadow-md"
                      />
                      <CardTitle className="mt-3 text-lg leading-tight flex items-center justify-center">
                        {channel.snippet.title}
                        {/* Verified badge would go here if data was available:
                        {channel.brandingSettings?.channel?.showVerifiedBadge && (
                          <CheckCircle className="ml-2 h-4 w-4 text-blue-500" />
                        )}
                        */}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-1.5 flex-grow">
                      <p className="text-sm font-semibold">
                        Subscribers: {formatSubscribers(channel.statistics?.subscriberCount)}
                        {channel.statistics?.hiddenSubscriberCount && <span className="text-xs"> (Hidden)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Country: {channel.snippet.country || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Similarity Score: {channel.frequency !== undefined ? channel.frequency : 'N/A'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(channel.id);
                          // Optional: show a toast/notification "Copied!"
                          // e.g. using a toast library
                          alert(`Channel ID ${channel.id} copied to clipboard!`);
                        }}
                        className="mt-2"
                      >
                        Copy Channel ID
                      </Button>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noopener noreferrer">
                          Visit Channel
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Example of a result card structure (to be mapped later) - kept for reference if needed */}
            {/*
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader className="items-center text-center">
                  <img src="https://via.placeholder.com/100" alt="Channel Thumbnail" className="w-16 h-16 rounded-full mx-auto" />
                  <CardTitle className="mt-2 text-lg">Channel Name</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-1">
                  <p className="text-sm font-semibold">Subscribers: 1.2M</p>
                  <p className="text-xs text-muted-foreground">Country: UAE</p>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText('CHANNEL_ID_HERE')}>
                    Copy ID
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <a href="#" target="_blank" rel="noopener noreferrer">Visit Channel</a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
