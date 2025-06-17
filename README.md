# Social Stats Comparator

This tool fetches and compares video statistics (views, likes, comments, shares, uploader follower count) for a list of Instagram and TikTok video URLs. It uses Apify actors to gather the data and outputs the results to a CSV file.

## Prerequisites

*   Python 3.x
*   An Apify account and your Apify API token.

## Setup

1.  **Download the script:**
    *   Ensure you have the `social_stats_comparator.py` script.

2.  **Install dependencies:**
    Open your terminal or command prompt and run:
    ```bash
    pip install apify-client
    ```

3.  **Set Apify API Token:**
    The script requires your Apify API token to be set as an environment variable named `APIFY_API_TOKEN`.

    *   **For macOS/Linux:**
        ```bash
        export APIFY_API_TOKEN="YOUR_APIFY_TOKEN"
        ```
        (Replace `"YOUR_APIFY_TOKEN"` with your actual token). You might want to add this line to your shell's configuration file (e.g., `.bashrc`, `.zshrc`) for persistence.

    *   **For Windows (Command Prompt):**
        ```bash
        set APIFY_API_TOKEN=YOUR_APIFY_TOKEN
        ```
        (Replace `YOUR_APIFY_TOKEN` with your actual token).
    *   **For Windows (PowerShell):**
        ```powershell
        $env:APIFY_API_TOKEN="YOUR_APIFY_TOKEN"
        ```
    *   Alternatively, you can set it through the System Properties > Environment Variables menu.

## Usage

1.  **Prepare Input File:**
    *   Create a file named `urls.txt` in the same directory where `social_stats_comparator.py` is located.
    *   Add one Instagram or TikTok video URL per line.

    Example `urls.txt`:
    ```
    https://www.instagram.com/p/Cabcdefghij/
    https://www.instagram.com/reel/anotherVideoID/
    https://www.tiktok.com/@username/video/1234567890123456789
    https://www.tiktok.com/@anotheruser/video/9876543210987654321
    ```

2.  **Run the Script:**
    Open your terminal or command prompt, navigate to the directory containing the script and `urls.txt`, and run:
    ```bash
    python social_stats_comparator.py
    ```

## Output

The script will generate a CSV file named `social_media_stats.csv` in the same directory. This file will contain the fetched statistics with the following columns:

*   `Video URL`: The original URL of the video.
*   `Platform`: The platform of the video (Instagram or TikTok).
*   `Views`: The number of views or plays the video has received.
*   `Likes`: The number of likes the video has received.
*   `Comments`: The number of comments on the video.
*   `Shares`: The number of times the video has been shared (Note: Instagram often does not provide share counts directly for posts, so this might be "N/A").
*   `Uploader Follower Count`: The number of followers the uploader of the video has.

## Error Handling & Logging

*   The script provides console output logging its progress, including any errors encountered during API calls (e.g., if a video is private, a URL is invalid, or an API token is missing/invalid).
*   If an Apify actor call fails or specific data points cannot be retrieved, the corresponding fields in the CSV output will contain "N/A" or an error-specific message (e.g., "N/A_instagram_api_error", "N/A_tiktok_data_missing").

## Limitations

*   The script relies on data publicly accessible to the Apify actors. It cannot scrape private videos or profiles.
*   The structure and availability of data from Instagram and TikTok platforms can change over time. This may affect the Apify actors' ability to retrieve data and, consequently, this script's functionality. Regular checks or updates to actor versions might be needed.
*   This is a command-line tool and does not provide a graphical user interface.
*   Instagram's public data access for posts typically does not include 'share' counts; this field will often be "N/A" for Instagram videos.
