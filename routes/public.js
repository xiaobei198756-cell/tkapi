const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { all, get, run } = require('../config/db');
const { getCountryCode } = require('../config/geoip');
const { hashValue, normalizeLeadInput } = require('../config/security');

const router = express.Router();
const tokenStorePath = path.join(__dirname, '..', 'data', 'tiktok-token.json');
const defaultTikTokApiBaseUrl = 'https://api.tikhub.io';
const defaultTikTokSearchPath = '/api/v1/tiktok/web/fetch_search_video';

const legalPages = {
  terms: {
    title: 'Terms of Service',
    intro:
      'TKAPI helps authorized users connect with TikTok APIs to manage account login, authorized data access, and compliant creator/content workflows.',
    sections: [
      {
        heading: 'Service Availability',
        body:
          'TKAPI is available for users and businesses in regions where TikTok services are available. It is not intended for Mainland China.'
      },
      {
        heading: 'Authorized Use',
        body:
          'Users must comply with TikTok Developer Terms, TikTok API permissions, applicable platform policies, and all laws that apply to their use of the service.'
      },
      {
        heading: 'API Permissions',
        body:
          'TKAPI uses official TikTok API and OAuth flows. Users may only access account, creator, or content data they are authorized to access through granted platform permissions.'
      },
      {
        heading: 'Contact',
        body:
          'For support or compliance questions, contact xiaobei198756@gmail.com.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'TKAPI uses official platform APIs and permissioned OAuth flows to support account login, authorized data access, and compliant creator/content workflows.',
    sections: [
      {
        heading: 'Public Access',
        body:
          'The homepage, Terms of Service, and Privacy Policy are publicly available without login for users, businesses, and platform review teams.'
      },
      {
        heading: 'Credential Handling',
        body:
          'Client secrets, access tokens, and refresh tokens are not displayed in the frontend. Sensitive credentials are used only by backend services controlled by the service operator.'
      },
      {
        heading: 'Data Use',
        body:
          'Authorized data is used to support account login, account-permitted data access, creator/content workflows, reporting, and service operation.'
      },
      {
        heading: 'Contact',
        body:
          'For privacy questions or data requests, contact xiaobei198756@gmail.com.'
      }
    ]
  }
};

function missingTikTokConfig() {
  return ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'].filter((key) => !process.env[key]);
}

function publicTikTokStatus() {
  try {
    const token = JSON.parse(fs.readFileSync(tokenStorePath, 'utf8'));
    return {
      connected: Boolean(token.access_token),
      open_id: token.open_id || null,
      scope: token.scope || process.env.TIKTOK_SCOPES || 'user.info.basic,video.list',
      expires_at: token.expires_at || null,
      message: token.access_token ? 'TikTok connected' : 'TikTok is not connected'
    };
  } catch (error) {
    return {
      connected: false,
      open_id: null,
      scope: process.env.TIKTOK_SCOPES || 'user.info.basic,video.list',
      expires_at: null,
      message: 'TikTok is not connected'
    };
  }
}

function saveTikTokToken(token) {
  fs.mkdirSync(path.dirname(tokenStorePath), { recursive: true });
  const now = Date.now();
  const payload = {
    open_id: token.open_id || null,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_in: token.expires_in,
    refresh_expires_in: token.refresh_expires_in,
    expires_at: token.expires_in ? new Date(now + Number(token.expires_in) * 1000).toISOString() : null,
    scope: token.scope || null,
    token_type: token.token_type || null,
    updated_at: new Date(now).toISOString()
  };
  fs.writeFileSync(tokenStorePath, JSON.stringify(payload, null, 2));
  return payload;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toIsoDate(value) {
  const number = toNumber(value);
  if (number) {
    return new Date(number * 1000).toISOString();
  }
  return typeof value === 'string' ? value : null;
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') || null;
}

function looksLikeTikTokVideo(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }
  return Boolean(
    item.aweme_id ||
      item.video_id ||
      item.id ||
      item.desc ||
      item.title ||
      item.share_url ||
      item.statistics ||
      item.stats
  );
}

function collectTikTokVideos(value, acc = [], seen = new Set()) {
  if (!value || acc.length >= 100) {
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectTikTokVideos(item, acc, seen));
    return acc;
  }
  if (typeof value !== 'object') {
    return acc;
  }

  const candidate = value.aweme_info || value.item || value;
  const videoId = firstValue(candidate.aweme_id, candidate.video_id, candidate.id, candidate.item_id);
  if (videoId && looksLikeTikTokVideo(candidate) && !seen.has(String(videoId))) {
    seen.add(String(videoId));
    acc.push(candidate);
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      collectTikTokVideos(child, acc, seen);
    }
  }
  return acc;
}

function normalizeTikTokVideo(item, keyword) {
  const stats = item.statistics || item.stats || item.stats_v2 || {};
  const author = item.author || item.author_info || {};
  const videoId = String(firstValue(item.aweme_id, item.video_id, item.id, item.item_id) || '');
  const uniqueId = firstValue(author.unique_id, author.sec_uid, author.uid, item.author_unique_id);
  return {
    platform: 'tiktok',
    keyword,
    video_id: videoId,
    title: firstValue(item.desc, item.title, item.item_desc, item.text, videoId),
    url: firstValue(item.share_url, item.url, videoId && uniqueId ? `https://www.tiktok.com/@${uniqueId}/video/${videoId}` : null),
    author: firstValue(author.unique_id, author.nickname, author.uid, item.author, item.author_name),
    published_at: toIsoDate(firstValue(item.create_time, item.createTime, item.created_at)),
    view_count: toNumber(firstValue(stats.play_count, stats.playCount, stats.view_count, stats.viewCount, item.play_count)),
    like_count: toNumber(firstValue(stats.digg_count, stats.like_count, stats.likeCount, item.like_count)),
    comment_count: toNumber(firstValue(stats.comment_count, stats.commentCount, item.comment_count)),
    favorite_count: toNumber(firstValue(stats.collect_count, stats.favorite_count, stats.favoriteCount, item.favorite_count)),
    share_count: toNumber(firstValue(stats.share_count, stats.shareCount, item.share_count)),
    updated_at: new Date().toISOString()
  };
}

function apiErrorMessage(status, payload) {
  const raw = JSON.stringify(payload || {});
  const lower = raw.toLowerCase();
  if (status === 401 || status === 403 || lower.includes('permission') || lower.includes('unauthorized')) {
    return 'TikTok API permission is insufficient. Please verify that the API token is valid and the required access is enabled.';
  }
  if (status === 402 || lower.includes('credit') || lower.includes('balance') || lower.includes('quota')) {
    return 'TikTok API credits or quota may be insufficient. Please check the API account balance and quota status.';
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many')) {
    return 'TikTok API rate limit，请稍后再试。';
  }
  return 'TikTok API request failed. Please review the Render backend logs.';
}

async function searchTikTokWithThirdPartyApi({ keyword, limit }) {
  const token = process.env.TIKTOK_API_TOKEN;
  if (!token) {
    const error = new Error('Missing TIKTOK_API_TOKEN. Please configure it in the Render environment variables first.');
    error.statusCode = 400;
    throw error;
  }

  const baseUrl = process.env.TIKTOK_API_BASE_URL || defaultTikTokApiBaseUrl;
  const searchPath = process.env.TIKTOK_API_SEARCH_PATH || defaultTikTokSearchPath;
  const url = new URL(searchPath, baseUrl);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('count', String(Math.min(Number(limit) || 20, 50)));
  url.searchParams.set('offset', '0');

  console.log(`[tiktok-search] keyword="${keyword}" endpoint="${url.origin}${url.pathname}"`);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { message: await response.text().catch(() => '') };
  }

  if (!response.ok) {
    console.error('[tiktok-search] API error', response.status, payload);
    const error = new Error(apiErrorMessage(response.status, payload));
    error.statusCode = response.status;
    throw error;
  }

  const videos = collectTikTokVideos(payload).slice(0, Math.min(Number(limit) || 20, 50));
  return videos.map((video) => normalizeTikTokVideo(video, keyword));
}

router.get('/terms', (req, res) => {
  res.render('public/legal', legalPages.terms);
});

router.get('/privacy', (req, res) => {
  res.render('public/legal', legalPages.privacy);
});

router.get('/features', (req, res) => {
  res.render('public/features');
});

router.get(['/keywords', '/dashboard'], (req, res) => {
  res.render('public/keywords');
});

router.get('/settings/tiktok', (req, res) => {
  res.render('public/tiktok-settings');
});

router.get('/api/tiktok/status', (req, res) => {
  const missing = missingTikTokConfig();
  res.json({
    ...publicTikTokStatus(),
    configured: missing.length === 0,
    missing
  });
});

router.get('/api/tiktok/auth-url', (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  const scope = process.env.TIKTOK_SCOPES || 'user.info.basic,video.list';
  const missing = ['TIKTOK_CLIENT_KEY', 'TIKTOK_REDIRECT_URI'].filter((key) => !process.env[key]);

  if (missing.length) {
    res.status(400).json({
      message: `Missing TikTok environment variable(s): ${missing.join(', ')}.`,
      missing
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  req.session.tiktokOAuthState = state;
  const params = new URLSearchParams({
    client_key: clientKey,
    scope,
    response_type: 'code',
    redirect_uri: redirectUri,
    state
  });

  res.json({
    auth_url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
    state
  });
});

router.get('/api/tiktok/callback', async (req, res) => {
  const missing = missingTikTokConfig();
  if (missing.length) {
    res.status(500).render('public/message', {
      title: 'TikTok OAuth is not configured',
      message: `Missing Render environment variable(s): ${missing.join(', ')}.`
    });
    return;
  }

  if (!req.query.state || req.query.state !== req.session.tiktokOAuthState) {
    res.status(400).render('public/message', {
      title: 'TikTok OAuth failed',
      message: 'OAuth state validation failed. Please start the TikTok connection again.'
    });
    return;
  }

  if (!req.query.code) {
    res.status(400).render('public/message', {
      title: 'TikTok OAuth failed',
      message: 'TikTok did not return an authorization code.'
    });
    return;
  }

  try {
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: String(req.query.code),
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI
      })
    });
    const tokenJson = await tokenResponse.json();
    if (!tokenResponse.ok) {
      res.status(tokenResponse.status).render('public/message', {
        title: 'TikTok token exchange failed',
        message: tokenJson.error_description || tokenJson.message || tokenJson.error || 'TikTok API request failed.'
      });
      return;
    }
    saveTikTokToken(tokenJson);
    delete req.session.tiktokOAuthState;
    res.render('public/message', {
      title: 'TikTok connected',
      message: 'TikTok OAuth token was saved on the backend. Access token and refresh token are not shown in the browser.'
    });
  } catch (error) {
    res.status(502).render('public/message', {
      title: 'TikTok token exchange failed',
      message: error.message || 'Network request to TikTok failed.'
    });
  }
});

router.post('/api/search/keywords', async (req, res) => {
  const keyword = String(req.body.keyword || '').trim();
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];
  const limit = Number(req.body.limit || 50);

  if (!keyword) {
    res.status(400).json({ message: 'keyword is required.' });
    return;
  }

  const warnings = [];
  const items = [];

  for (const platform of platforms) {
    if (platform === 'tiktok') {
      try {
        const tiktokItems = await searchTikTokWithThirdPartyApi({ keyword, limit });
        items.push(...tiktokItems);
        if (!tiktokItems.length) {
          warnings.push('TikTok：没有搜索到数据。');
        }
      } catch (error) {
        res.status(error.statusCode || 502).json({
          message: error.message || 'TikTok API request failed. Please review the Render backend logs.',
          items,
          warnings
        });
        return;
      }
      continue;
    }

    warnings.push(`${platform}: official API integration is not enabled in this Express deployment yet.`);
  }

  res.json({
    items,
    warnings
  });
});

function countryAllowed(allowedCountries, countryCode) {
  const list = String(allowedCountries || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(countryCode);
}

async function getAvailableAccounts(campaignId) {
  return all(
    `
      SELECT
        a.*,
        COUNT(la.id) AS assigned_today
      FROM accounts a
      LEFT JOIN lead_assignments la
        ON la.assigned_account_id = a.id
       AND la.campaign_id = ?
       AND date(la.created_at) = date('now', 'localtime')
      WHERE a.enabled = 1
      GROUP BY a.id
      HAVING assigned_today < a.daily_limit
      ORDER BY a.id ASC
    `,
    [campaignId]
  );
}

function chooseRoundRobinAccount(accounts, lastAssignedAccountId) {
  if (!accounts.length) {
    return null;
  }
  const lastIndex = accounts.findIndex((account) => account.id === lastAssignedAccountId);
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % accounts.length : 0;
  return accounts[nextIndex];
}

async function recordClick(req, campaign, userHash, account, countryCode) {
  const ipHash = hashValue(req.clientIp || req.ip || 'unknown-ip');
  await run(
    `
      INSERT INTO click_logs
        (campaign_id, user_hash, assigned_account_id, platform, country_code, ip_hash, user_agent, redirect_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      campaign.id,
      userHash,
      account ? account.id : null,
      account ? account.platform : null,
      countryCode,
      ipHash,
      req.headers['user-agent'] || '',
      account ? account.contact_url : null
    ]
  );
}

router.get('/go/:slug', async (req, res, next) => {
  try {
    const campaign = await get('SELECT * FROM campaigns WHERE slug = ? AND enabled = 1', [req.params.slug]);
    if (!campaign) {
      res.status(404).render('public/message', {
        title: 'Link unavailable',
        message: 'This campaign link does not exist or has been disabled.'
      });
      return;
    }

    const countryCode = getCountryCode(req);
    if (!countryAllowed(campaign.allowed_countries, countryCode)) {
      await recordClick(req, campaign, null, null, countryCode);
      res.status(403).render('public/message', {
        title: 'Region not supported',
        message: 'This campaign link is not available in your current region.'
      });
      return;
    }

    res.render('public/lead-form', {
      campaign,
      countryCode,
      error: null,
      leadIdentifier: ''
    });
  } catch (error) {
    next(error);
  }
});

router.post('/go/:slug', async (req, res, next) => {
  try {
    const campaign = await get('SELECT * FROM campaigns WHERE slug = ? AND enabled = 1', [req.params.slug]);
    if (!campaign) {
      res.status(404).render('public/message', {
        title: 'Link unavailable',
        message: 'This campaign link does not exist or has been disabled.'
      });
      return;
    }

    const countryCode = getCountryCode(req);
    if (!countryAllowed(campaign.allowed_countries, countryCode)) {
      await recordClick(req, campaign, null, null, countryCode);
      res.status(403).render('public/message', {
        title: 'Region not supported',
        message: 'This campaign link is not available in your current region.'
      });
      return;
    }

    const leadIdentifier = normalizeLeadInput(req.body.lead_identifier);
    if (!leadIdentifier || leadIdentifier.length < 4 || req.body.consent !== 'on') {
      res.status(400).render('public/lead-form', {
        campaign,
        countryCode,
        error: 'Please enter a valid phone number or lead ID and accept the privacy notice.',
        leadIdentifier: req.body.lead_identifier || ''
      });
      return;
    }

    const userHash = hashValue(leadIdentifier);
    const existing = await get(
      `
        SELECT la.*, a.account_name, a.platform, a.contact_url
        FROM lead_assignments la
        JOIN accounts a ON a.id = la.assigned_account_id
        WHERE la.campaign_id = ? AND la.user_hash = ?
      `,
      [campaign.id, userHash]
    );

    let account = existing
      ? {
          id: existing.assigned_account_id,
          account_name: existing.account_name,
          platform: existing.platform,
          contact_url: existing.contact_url
        }
      : null;

    if (!account) {
      const accounts = await getAvailableAccounts(campaign.id);
      account = chooseRoundRobinAccount(accounts, campaign.last_assigned_account_id);
      if (!account) {
        await recordClick(req, campaign, userHash, null, countryCode);
        res.status(503).render('public/message', {
          title: 'Support is busy',
          message: 'No support account is currently available. Please try again later.'
        });
        return;
      }

      await run(
        'INSERT INTO lead_assignments (campaign_id, user_hash, assigned_account_id) VALUES (?, ?, ?)',
        [campaign.id, userHash, account.id]
      );
      await run('UPDATE campaigns SET last_assigned_account_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        account.id,
        campaign.id
      ]);
    }

    await recordClick(req, campaign, userHash, account, countryCode);
    res.redirect(account.contact_url);
  } catch (error) {
    next(error);
  }
});

module.exports = router;


