# API Setup

## YouTube

Set `YOUTUBE_API_KEY`. The backend uses YouTube Data API v3 `search.list` followed by `videos.list`.

## X

Set `X_BEARER_TOKEN`. Keyword collection uses recent search with:

```text
keyword has:videos
```

Some media fields may require additional API permissions and expanded query fields.

## TikTok

Set:

```text
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_API_PROVIDER=official
TIKTOK_REDIRECT_URI=https://tkapi.onrender.com/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.list
```

Current implemented official flows:

- OAuth authorization URL
- OAuth callback
- token refresh
- Display API user video list
- Display API video query by video IDs

Keyword search requires approved TikTok Research API access. No third-party TikTok API is active.

## Instagram / Facebook

Set Meta variables when Graph API permissions are available:

```text
META_ACCESS_TOKEN=
IG_USER_ID=
FB_PAGE_IDS=
```

Current adapters return permission/configuration status only.
