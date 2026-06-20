const express = require('express');
const crypto = require('crypto');
const { all, get, run } = require('../config/db');
const { getCountryCode } = require('../config/geoip');
const { hashValue, normalizeLeadInput } = require('../config/security');

const router = express.Router();

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
  res.json({
    connected: false,
    open_id: null,
    scope: process.env.TIKTOK_SCOPES || 'user.info.basic,video.list',
    message: 'TikTok OAuth token storage is not connected in this Express deployment yet.'
  });
});

router.get('/api/tiktok/auth-url', (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://tkapi.onrender.com/api/tiktok/callback';
  const scope = process.env.TIKTOK_SCOPES || 'user.info.basic,video.list';

  if (!clientKey) {
    res.status(400).json({ message: 'TIKTOK_CLIENT_KEY is not configured.' });
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

router.get('/api/tiktok/callback', (req, res) => {
  if (!req.query.state || req.query.state !== req.session.tiktokOAuthState) {
    res.status(400).render('public/message', {
      title: 'TikTok 授权失败',
      message: 'OAuth state 校验失败，请重新发起授权。'
    });
    return;
  }

  res.render('public/message', {
    title: 'TikTok 授权回调已收到',
    message: '当前 Express 部署已收到 TikTok 回调。完整 token 交换逻辑需要在后端安全保存 client_secret 后启用。'
  });
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
      return 'TikTok 关键词搜索需要官方对应权限，当前只能获取授权账号或允许范围内的数据。';
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
        title: '链接不可用',
        message: '该分流链接不存在或已停用。'
      });
      return;
    }

    const countryCode = getCountryCode(req);
    if (!countryAllowed(campaign.allowed_countries, countryCode)) {
      await recordClick(req, campaign, null, null, countryCode);
      res.status(403).render('public/message', {
        title: '暂不支持该地区',
        message: '当前地区暂不在该客服链接的服务范围内。'
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
        title: '链接不可用',
        message: '该分流链接不存在或已停用。'
      });
      return;
    }

    const countryCode = getCountryCode(req);
    if (!countryAllowed(campaign.allowed_countries, countryCode)) {
      await recordClick(req, campaign, null, null, countryCode);
      res.status(403).render('public/message', {
        title: '暂不支持该地区',
        message: '当前地区暂不在该客服链接的服务范围内。'
      });
      return;
    }

    const leadIdentifier = normalizeLeadInput(req.body.lead_identifier);
    if (!leadIdentifier || leadIdentifier.length < 4 || req.body.consent !== 'on') {
      res.status(400).render('public/lead-form', {
        campaign,
        countryCode,
        error: '请填写手机号或线索编号，并勾选同意后再提交。',
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
          title: '当前客服繁忙',
          message: '当前客服繁忙，请稍后再试。'
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
