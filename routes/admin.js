const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../config/db');
const { requireAdmin, setFlash } = require('./auth');
const { isValidContactUrl, normalizeCountryList, slugify } = require('../config/security');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const admin = await get('SELECT * FROM admin_users WHERE username = ?', [username]);
    const ok = admin && (await bcrypt.compare(password || '', admin.password_hash));
    if (!ok) {
      res.status(401).render('admin/login', { error: '用户名或密码错误。' });
      return;
    }

    req.session.user = { id: admin.id, username: admin.username };
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const stats = {
      accounts: await get('SELECT COUNT(*) AS count FROM accounts'),
      campaigns: await get('SELECT COUNT(*) AS count FROM campaigns'),
      clicks: await get('SELECT COUNT(*) AS count FROM click_logs'),
      assignments: await get('SELECT COUNT(*) AS count FROM lead_assignments')
    };
    const accountStats = await all(`
      SELECT a.id, a.account_name, a.platform, COUNT(la.id) AS assignment_count
      FROM accounts a
      LEFT JOIN lead_assignments la ON la.assigned_account_id = a.id
      GROUP BY a.id
      ORDER BY assignment_count DESC, a.id ASC
      LIMIT 10
    `);
    res.render('admin/dashboard', { stats, accountStats });
  } catch (error) {
    next(error);
  }
});

router.get('/accounts', requireAdmin, async (req, res, next) => {
  try {
    const accounts = await all(`
      SELECT a.*, COUNT(la.id) AS assignment_count
      FROM accounts a
      LEFT JOIN lead_assignments la ON la.assigned_account_id = a.id
      GROUP BY a.id
      ORDER BY a.id DESC
    `);
    res.render('admin/accounts', { accounts });
  } catch (error) {
    next(error);
  }
});

router.get('/accounts/new', requireAdmin, (req, res) => {
  res.render('admin/account-form', { account: {}, error: null });
});

router.post('/accounts', requireAdmin, async (req, res, next) => {
  try {
    const accountName = String(req.body.account_name || '').trim();
    const platform = String(req.body.platform || '').trim();
    const contactUrl = String(req.body.contact_url || '').trim();
    const countryCode = String(req.body.country_code || '').trim().toUpperCase();
    const dailyLimit = Number.parseInt(req.body.daily_limit, 10);
    const enabled = req.body.enabled === 'on' ? 1 : 0;

    if (
      !accountName ||
      !['whatsapp', 'telegram'].includes(platform) ||
      !isValidContactUrl(platform, contactUrl) ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      !Number.isInteger(dailyLimit) ||
      dailyLimit < 1
    ) {
      res.status(400).render('admin/account-form', {
        account: req.body,
        error: '请检查账号名称、平台、链接格式、国家代码和每日上限。'
      });
      return;
    }

    await run(
      `
        INSERT INTO accounts
          (account_name, platform, contact_url, country_code, daily_limit, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [accountName, platform, contactUrl, countryCode, dailyLimit, enabled]
    );
    setFlash(req, 'success', '客服账号已添加。');
    res.redirect('/admin/accounts');
  } catch (error) {
    next(error);
  }
});

router.post('/accounts/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    await run('UPDATE accounts SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      req.params.id
    ]);
    res.redirect('/admin/accounts');
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns', requireAdmin, async (req, res, next) => {
  try {
    const campaigns = await all(`
      SELECT c.*, COUNT(DISTINCT cl.id) AS click_count, COUNT(DISTINCT la.id) AS assignment_count
      FROM campaigns c
      LEFT JOIN click_logs cl ON cl.campaign_id = c.id
      LEFT JOIN lead_assignments la ON la.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    res.render('admin/campaigns', { campaigns });
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns/new', requireAdmin, (req, res) => {
  res.render('admin/campaign-form', { campaign: {}, error: null });
});

router.post('/campaigns', requireAdmin, async (req, res, next) => {
  try {
    const campaignName = String(req.body.campaign_name || '').trim();
    const slug = slugify(req.body.slug || campaignName);
    const allowedCountries = normalizeCountryList(req.body.allowed_countries);
    const enabled = req.body.enabled === 'on' ? 1 : 0;

    if (!campaignName || !slug) {
      res.status(400).render('admin/campaign-form', {
        campaign: req.body,
        error: '请填写 Campaign 名称和有效 slug。'
      });
      return;
    }

    await run(
      `
        INSERT INTO campaigns
          (campaign_name, slug, allowed_countries, enabled)
        VALUES (?, ?, ?, ?)
      `,
      [campaignName, slug, allowedCountries, enabled]
    );
    setFlash(req, 'success', 'Campaign 已创建。');
    res.redirect('/admin/campaigns');
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      res.status(400).render('admin/campaign-form', {
        campaign: req.body,
        error: '该 slug 已存在，请换一个。'
      });
      return;
    }
    next(error);
  }
});

router.post('/campaigns/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    await run('UPDATE campaigns SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      req.params.id
    ]);
    res.redirect('/admin/campaigns');
  } catch (error) {
    next(error);
  }
});

router.get('/clicks', requireAdmin, async (req, res, next) => {
  try {
    const date = String(req.query.date || '').trim();
    const campaignId = String(req.query.campaign_id || '').trim();
    const params = [];
    const where = [];

    if (date) {
      where.push("date(cl.clicked_at) = date(?)");
      params.push(date);
    }
    if (campaignId) {
      where.push('cl.campaign_id = ?');
      params.push(campaignId);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const clicks = await all(
      `
        SELECT cl.*, c.campaign_name, a.account_name
        FROM click_logs cl
        JOIN campaigns c ON c.id = cl.campaign_id
        LEFT JOIN accounts a ON a.id = cl.assigned_account_id
        ${whereSql}
        ORDER BY cl.clicked_at DESC
        LIMIT 500
      `,
      params
    );
    const campaigns = await all('SELECT id, campaign_name FROM campaigns ORDER BY campaign_name ASC');
    res.render('admin/clicks', { clicks, campaigns, filters: { date, campaignId } });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const byCampaign = await all(`
      SELECT c.campaign_name, c.slug, COUNT(DISTINCT cl.id) AS click_count, COUNT(DISTINCT la.id) AS assignment_count
      FROM campaigns c
      LEFT JOIN click_logs cl ON cl.campaign_id = c.id
      LEFT JOIN lead_assignments la ON la.campaign_id = c.id
      GROUP BY c.id
      ORDER BY click_count DESC
    `);
    const byAccount = await all(`
      SELECT a.account_name, a.platform, a.country_code, COUNT(la.id) AS assignment_count
      FROM accounts a
      LEFT JOIN lead_assignments la ON la.assigned_account_id = a.id
      GROUP BY a.id
      ORDER BY assignment_count DESC
    `);
    const byDay = await all(`
      SELECT date(clicked_at) AS day, COUNT(*) AS click_count
      FROM click_logs
      GROUP BY date(clicked_at)
      ORDER BY day DESC
      LIMIT 30
    `);
    res.render('admin/stats', { byCampaign, byAccount, byDay });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
