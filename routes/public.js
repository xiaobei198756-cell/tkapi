const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { all, get, run } = require('../config/db');
const { getCountryCode } = require('../config/geoip');
const { hashValue, normalizeLeadInput } = require('../config/security');

const router = express.Router();
const tokenStorePath = path.join(__dirname, '..', 'data', 'tiktok-token.json');

const legalPages = {
  terms: {
    title: 'Terms of Service',
    intro:
      'TKAPI is a TikTok public video data analysis tool for video data analysis, trend analysis, and account features.',
    sections: [
      {
        heading: 'Acceptable Use',
        body:
          'Users must use this service lawfully. Users may not abuse the API, bypass platform rules, or infringe the privacy, copyright, or other lawful rights of others.'
      },
      {
        heading: 'Third-Party Data Availability',
        body:
          'TKAPI does not guarantee the permanent availability of third-party platform data. Specific data access depends on TikTok API access or publicly available data permissions.'
      },
      {
        heading: 'Agreement',
        body: 'By using this service, users agree to these terms.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'TKAPI processes data only within the scope authorized by users or allowed by the TikTok API.',
    sections: [
      {
        heading: 'Data Use',
        body:
          'Data is used only for video data analysis, trend analysis, account features, and service optimization.'
      },
      {
        heading: 'Data Sharing',
        body:
          'TKAPI does not sell user data and does not use user data for unauthorized purposes.'
      },
      {
        heading: 'Contact',
        body:
          'If users need to delete data or ask data-related questions, they can contact xiaobei198756@gmail.com.'
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

router.post('/api/search/keywords', (req, res) => {
  const keyword = String(req.body.keyword || '').trim();
  const platforms = Array.isArray(req.body.platforms) ? req.body.platforms : [];

  if (!keyword) {
    res.status(400).json({ message: 'keyword is required.' });
    return;
  }

  const warnings = platforms.map((platform) => {
    if (platform === 'tiktok') {
      return 'TikTok keyword search requires official permission. Current access is limited to authorized/account-permitted data.';
    }
    return `${platform}: official API integration is not enabled in this Express deployment yet.`;
  });

  res.json({
    items: [],
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
