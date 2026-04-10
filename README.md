# Cloudflare RSS Worker

A lightweight Cloudflare Worker that converts XML RSS feeds into clean, structured JSON with CORS support.

## What This Worker Does

This worker sits in front of your RSS server and converts its XML feed into clean, structured JSON ready to consume from any frontend, mobile app, or automation.

Hit `/rss/{username}` and you get back a tidy object with title, link, description and an items array. No nested #text nodes, no @attributes clutter - just the data you actually want.

## Usage

```
GET /rss/{username}
```

Returns structured JSON for the specified user's RSS feed.

## Example Response

```json
{
  "type": "rss",
  "title": "Alice's Mailbox Feed",
  "link": "https://example.com",
  "description": "Latest updates",
  "lastBuild": "Fri, 10 Apr 2025 08:00:00 GMT",
  "items": [
    {
      "title": "Welcome email",
      "link": "https://example.com/msg/1",
      "description": "Hello and welcome aboard...",
      "pubDate": "Fri, 10 Apr 2025 07:45:00 GMT",
      "guid": "msg-001",
      "author": "admin@example.com",
      "category": ["announcements"]
    }
  ]
}
```

## One-Time Setup

1. **Create Cloudflare API Token**
   - Go to Cloudflare dashboard > My Profile > API Tokens > Create Token
   - Use the "Edit Cloudflare Workers" template
   - Copy the token value (you only see it once)

2. **Add GitHub Secret**
   - Go to your GitHub repo > Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `CF_API_TOKEN` | Value: (paste your token)

3. **Deploy**
   - Push your files to main branch - GitHub Actions will auto-deploy

## Local Development

```bash
# Install wrangler globally (one-time)
npm install -g wrangler

# Log in to Cloudflare
wrangler login

# Start local dev server
wrangler dev
```

Your worker will be available at `http://localhost:8787`. Test with `/rss/yourusername`.

## Project Structure

```
CROSSPROXY/
  worker.js          # Main worker script
  wrangler.toml      # Wrangler configuration
  .github/
    workflows/
      deploy.yml     # GitHub Actions auto-deploy
  README.md          # This file
```

## Features

- **RSS 2.0 & Atom Support**: Automatically parses both feed formats
- **CORS Enabled**: `Access-Control-Allow-Origin: *` headers
- **Error Handling**: Graceful error responses with proper HTTP status codes
- **Clean JSON**: No XML artifacts, just clean data structures
- **Auto-Deployment**: GitHub Actions deploys on every push to main
