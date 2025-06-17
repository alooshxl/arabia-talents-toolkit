# social_stats_comparator.py

import os
import logging
import csv # Import the csv module
from apify_client import ApifyClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_instagram_video_stats(video_url, apify_client):
  """
  Fetches video statistics for a given Instagram video URL using Apify actors.
  """
  stats = {
    "platform": "Instagram",
    "url": video_url,
    "views": "N/A_instagram_api_error",
    "likes": "N/A_instagram_api_error",
    "comments": "N/A_instagram_api_error",
    "shares": "N/A",
    "uploader_follower_count": "N/A_instagram_api_error"
  }
  owner_username = None
  try:
    logging.info(f"Fetching Instagram post data for {video_url}...")
    post_scraper_input = {"directUrls": [video_url]}
    post_actor_run = apify_client.actor("apify/instagram-post-scraper").call(run_input=post_scraper_input)
    if post_actor_run and post_actor_run.get("defaultDatasetId"):
      dataset_items = list(apify_client.dataset(post_actor_run["defaultDatasetId"]).iterate_items())
      if dataset_items:
        post_data = dataset_items[0]
        stats["views"] = post_data.get("videoViewCount") or post_data.get("playCount") or post_data.get("videoPlayCount", "N/A_post_data_missing")
        stats["likes"] = post_data.get("likesCount") or post_data.get("likeCount", "N/A_post_data_missing")
        stats["comments"] = post_data.get("commentsCount", "N/A_post_data_missing")
        owner_username = post_data.get("ownerUsername")
        if not owner_username:
            logging.warning(f"Owner username not found in Instagram post data for {video_url}.")
            stats["uploader_follower_count"] = "N/A_username_missing"
      else:
        logging.warning(f"No items found in dataset for instagram-post-scraper run for {video_url}. Defaulting N/A values.")
    else:
      logging.warning(f"Failed to get datasetId from instagram-post-scraper run for {video_url}. Defaulting N/A values.")
  except Exception as e:
    logging.error(f"Error calling apify/instagram-post-scraper for {video_url}: {e}")

  if owner_username:
    try:
      logging.info(f"Fetching Instagram profile data for {owner_username}...")
      profile_scraper_input = {"usernames": [owner_username]}
      profile_actor_run = apify_client.actor("apify/instagram-profile-scraper").call(run_input=profile_scraper_input)
      if profile_actor_run and profile_actor_run.get("defaultDatasetId"):
        dataset_items = list(apify_client.dataset(profile_actor_run["defaultDatasetId"]).iterate_items())
        if dataset_items:
          profile_data = dataset_items[0]
          stats["uploader_follower_count"] = profile_data.get("followersCount", "N/A_profile_data_missing")
        else:
          logging.warning(f"No items found in dataset for instagram-profile-scraper run for {owner_username}. Setting follower count to N/A.")
          stats["uploader_follower_count"] = "N/A_profile_data_empty"
      else:
        logging.warning(f"Failed to get datasetId from instagram-profile-scraper run for {owner_username}. Setting follower count to N/A.")
        stats["uploader_follower_count"] = "N/A_profile_run_failed"
    except Exception as e:
      logging.error(f"Error calling apify/instagram-profile-scraper for {owner_username}: {e}")
      stats["uploader_follower_count"] = "N/A_instagram_api_error"
  elif not stats["uploader_follower_count"]:
      stats["uploader_follower_count"] = "N/A_username_missing_for_profile_scrape"
  return stats

def get_tiktok_video_stats(video_url, apify_client):
  """
  Fetches video statistics for a given TikTok video URL using Apify actors.
  """
  stats = {
    "platform": "TikTok",
    "url": video_url,
    "views": "N/A_tiktok_api_error",
    "likes": "N/A_tiktok_api_error",
    "comments": "N/A_tiktok_api_error",
    "shares": "N/A_tiktok_api_error",
    "uploader_follower_count": "N/A_tiktok_api_error"
  }
  author_username = None
  try:
    logging.info(f"Fetching TikTok video data for {video_url}...")
    video_scraper_input = {"videoUrls": [video_url]}
    video_actor_run = apify_client.actor("clockworks/tiktok-scraper").call(run_input=video_scraper_input)
    if video_actor_run and video_actor_run.get("defaultDatasetId"):
      dataset_items = list(apify_client.dataset(video_actor_run["defaultDatasetId"]).iterate_items())
      if dataset_items:
        video_data = dataset_items[0]
        stats["views"] = video_data.get("playCount", "N/A_tiktok_data_missing")
        stats["likes"] = video_data.get("diggCount", "N/A_tiktok_data_missing")
        stats["comments"] = video_data.get("commentCount", "N/A_tiktok_data_missing")
        stats["shares"] = video_data.get("shareCount", "N/A_tiktok_data_missing")
        author_meta = video_data.get("authorMeta")
        if author_meta:
          stats["uploader_follower_count"] = author_meta.get("fans", "N/A_tiktok_data_missing")
          author_username = author_meta.get("name")
          if stats["uploader_follower_count"] == "N/A_tiktok_data_missing" and author_username:
            logging.info(f"Follower count not in TikTok video data for {video_url}. Author: {author_username}. Consider profile scrape.")
            stats["uploader_follower_count"] = "N/A_tiktok_profile_scrape_needed"
        else:
          logging.warning(f"Author metadata not found in TikTok video data for {video_url}. Setting follower count to N/A.")
          stats["uploader_follower_count"] = "N/A_tiktok_author_meta_missing"
      else:
        logging.warning(f"No items found in dataset for TikTok video scraper run for {video_url}. Defaulting N/A values.")
    else:
      logging.warning(f"Failed to get datasetId from TikTok video scraper run for {video_url}. Defaulting N/A values.")
  except Exception as e:
    logging.error(f"Error calling TikTok video scraper for {video_url}: {e}")
    stats["views"] = "N/A_tiktok_api_error"
    stats["likes"] = "N/A_tiktok_api_error"
    stats["comments"] = "N/A_tiktok_api_error"
    stats["shares"] = "N/A_tiktok_api_error"
    stats["uploader_follower_count"] = "N/A_tiktok_api_error"
  return stats

def write_stats_to_csv(video_stats_list, filename="social_media_stats.csv"):
  """
  Writes a list of video statistics dictionaries to a CSV file.
  """
  if not video_stats_list:
    logging.warning("Video statistics list is empty. CSV file will not be created.")
    print("No statistics were collected to write to CSV.")
    return

  csv_headers = ["Video URL", "Platform", "Views", "Likes", "Comments", "Shares", "Uploader Follower Count"]

  try:
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
      writer = csv.DictWriter(csvfile, fieldnames=csv_headers)
      writer.writeheader()
      for video_dict in video_stats_list:
        # Map internal keys to CSV header names
        row_to_write = {
          "Video URL": video_dict.get("url"),
          "Platform": video_dict.get("platform"),
          "Views": video_dict.get("views"),
          "Likes": video_dict.get("likes"),
          "Comments": video_dict.get("comments"),
          "Shares": video_dict.get("shares"),
          "Uploader Follower Count": video_dict.get("uploader_follower_count")
        }
        writer.writerow(row_to_write)
    logging.info(f"Successfully wrote statistics to {filename}")
    print(f"Statistics successfully written to {filename}")
  except IOError as e:
    logging.error(f"IOError writing to CSV file {filename}: {e}")
    print(f"Error: Could not write to CSV file {filename}.")
  except Exception as e:
    logging.error(f"An unexpected error occurred during CSV writing: {e}")
    print(f"An unexpected error occurred while writing to CSV: {e}")


def main():
  """
  Main function to read URLs, fetch stats, collect them, and write to CSV.
  """
  logging.info("Script starting...")
  all_video_stats = []

  try:
    apify_client = ApifyClient()
    logging.info("ApifyClient initialized successfully.")
  except Exception as e:
    logging.error(f"Failed to initialize ApifyClient: {e}. Ensure APIFY_API_TOKEN is set.")
    print("Error: Failed to initialize ApifyClient. Please set the APIFY_API_TOKEN environment variable. Script will exit.")
    return

  try:
    with open("urls.txt", "r") as f:
      video_urls = [line.strip() for line in f if line.strip()]
    if not video_urls:
      logging.warning("urls.txt is empty. No URLs to process.")
      print("urls.txt is empty. No URLs to process. Script will exit.")
      return
  except FileNotFoundError:
    logging.error("urls.txt not found. Please create it with one URL per line. Script will exit.")
    print("Error: urls.txt not found. Please create it with one URL per line. Script will exit.")
    return

  logging.info(f"Found {len(video_urls)} URLs to process from urls.txt.")

  for url in video_urls:
    print(f"\nProcessing URL: {url}")
    video_stats = None
    if "instagram.com" in url:
      video_stats = get_instagram_video_stats(url, apify_client)
    elif "tiktok.com" in url:
      video_stats = get_tiktok_video_stats(url, apify_client)
    else:
      logging.warning(f"Skipping unsupported URL: {url}")
      print(f"Skipping unsupported URL: {url}")
      continue

    if video_stats:
      all_video_stats.append(video_stats)
      logging.info(f"Successfully processed and added stats for {url}.")
    else:
      logging.warning(f"No stats were generated for URL: {url}.")


  logging.info("Finished fetching data for all URLs.")

  # Write the collected stats to CSV
  write_stats_to_csv(all_video_stats)

  # The line below for printing all_video_stats to console is now removed/commented out
  # print("\n--- Collected Video Statistics ---")
  # if all_video_stats:
  #   for item_index, item_stats in enumerate(all_video_stats):
  #       print(f"\nItem {item_index + 1}:")
  #       for key, value in item_stats.items():
  #           print(f"  {key}: {value}")
  # else:
  #   print("No statistics were collected.")

  logging.info("Script finished.")

if __name__ == "__main__":
  main()
