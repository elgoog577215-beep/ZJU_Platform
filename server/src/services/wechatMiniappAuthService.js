const crypto = require('crypto');

const WECHAT_LOGIN_CODE_RE = /^[A-Za-z0-9_-]{8,160}$/;
const WECHAT_BIND_TICKET_RE = /^[A-Za-z0-9_-]{32,256}$/;
const WECHAT_BIND_TICKET_TTL_MS = 5 * 60 * 1000;
const WECHAT_CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

const hashValue = (value) => crypto
  .createHash('sha256')
  .update(String(value || ''))
  .digest('hex');

const createPublicError = (statusCode, publicMessage, errorCode) => {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  error.errorCode = errorCode;
  return error;
};

const createBindingTicket = () => crypto.randomBytes(32).toString('base64url');

const exchangeWechatLoginCode = async (code) => {
  const appid = process.env.WECHAT_MINIAPP_APPID || process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_MINIAPP_SECRET || process.env.WECHAT_APP_SECRET;

  if (!appid || !secret) {
    throw createPublicError(503, 'WeChat login is not configured', 'WECHAT_NOT_CONFIGURED');
  }

  if (typeof fetch !== 'function') {
    const error = new Error('Global fetch is unavailable in this Node.js runtime');
    error.statusCode = 500;
    error.publicMessage = 'Server runtime does not support WeChat login';
    throw error;
  }

  const url = new URL(WECHAT_CODE2SESSION_URL);
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = new Error(`WeChat code2session HTTP ${response.status}`);
    error.statusCode = 502;
    error.publicMessage = 'WeChat login failed';
    throw error;
  }

  const data = await response.json();
  if (data.errcode) {
    const error = new Error(`WeChat code2session failed: ${data.errcode}`);
    error.statusCode = 401;
    error.publicMessage = 'WeChat login failed';
    error.wechatErrcode = data.errcode;
    error.wechatErrmsg = data.errmsg;
    throw error;
  }

  if (!data.openid) {
    const error = new Error('WeChat code2session response missing openid');
    error.statusCode = 502;
    error.publicMessage = 'WeChat login failed';
    throw error;
  }

  return data;
};

const findBoundWechatMiniappUser = async (db, session) => {
  const now = new Date().toISOString();
  const sessionKeyHash = session.session_key ? hashValue(session.session_key) : null;
  const unionid = session.unionid || null;
  let transactionOpen = false;

  await db.exec('BEGIN IMMEDIATE');
  transactionOpen = true;
  try {
    const existingIdentity = await db.get(
      `SELECT wi.user_id, u.id, u.username, u.role, u.nickname, u.avatar
       FROM wechat_miniapp_identities wi
       JOIN users u ON u.id = wi.user_id
       WHERE wi.openid = ?`,
      [session.openid]
    );

    if (!existingIdentity) {
      await db.exec('COMMIT');
      transactionOpen = false;
      throw createPublicError(409, 'Please sign in with your website account and bind WeChat first', 'WECHAT_NOT_BOUND');
    }

    await db.run(
      `UPDATE wechat_miniapp_identities
       SET unionid = COALESCE(?, unionid),
           session_key_hash = ?,
           last_login_at = ?,
           updated_at = ?
       WHERE openid = ?`,
      [unionid, sessionKeyHash, now, now, session.openid]
    );
    await db.exec('COMMIT');
    transactionOpen = false;
    return existingIdentity;
  } catch (error) {
    if (transactionOpen) {
      await db.exec('ROLLBACK').catch((rollbackError) => {
        console.warn('Rollback warning (wechat_miniapp_login):', rollbackError.message);
      });
    }
    throw error;
  }
};

const bindWechatMiniappIdentity = async (db, session, ticket) => {
  const now = new Date().toISOString();
  const sessionKeyHash = session.session_key ? hashValue(session.session_key) : null;
  const unionid = session.unionid || null;
  const ticketHash = hashValue(ticket);
  let transactionOpen = false;

  await db.exec('BEGIN IMMEDIATE');
  transactionOpen = true;
  try {
    const bindTicket = await db.get(
      `SELECT id, user_id, expires_at, used_at
       FROM wechat_miniapp_binding_tickets
       WHERE ticket_hash = ?`,
      [ticketHash]
    );

    if (
      !bindTicket ||
      bindTicket.used_at ||
      Number.isNaN(Date.parse(bindTicket.expires_at)) ||
      new Date(bindTicket.expires_at).getTime() <= Date.now()
    ) {
      await db.exec('COMMIT');
      transactionOpen = false;
      throw createPublicError(400, 'WeChat binding ticket is invalid or expired', 'WECHAT_BIND_TICKET_INVALID');
    }

    const existingOpenidIdentity = await db.get(
      `SELECT user_id
       FROM wechat_miniapp_identities
       WHERE openid = ?`,
      [session.openid]
    );

    if (existingOpenidIdentity && Number(existingOpenidIdentity.user_id) !== Number(bindTicket.user_id)) {
      await db.exec('COMMIT');
      transactionOpen = false;
      throw createPublicError(409, 'This WeChat account is already bound to another account', 'WECHAT_ALREADY_BOUND');
    }

    const existingUserIdentity = await db.get(
      `SELECT openid
       FROM wechat_miniapp_identities
       WHERE user_id = ?
       LIMIT 1`,
      [bindTicket.user_id]
    );

    if (existingUserIdentity && existingUserIdentity.openid !== session.openid) {
      await db.exec('COMMIT');
      transactionOpen = false;
      throw createPublicError(409, 'This website account already has a bound WeChat account', 'WECHAT_USER_ALREADY_BOUND');
    }

    if (existingOpenidIdentity) {
      await db.run(
        `UPDATE wechat_miniapp_identities
         SET unionid = COALESCE(?, unionid),
             session_key_hash = ?,
             updated_at = ?
         WHERE openid = ?`,
        [unionid, sessionKeyHash, now, session.openid]
      );
    } else {
      await db.run(
        `INSERT INTO wechat_miniapp_identities
          (user_id, openid, unionid, session_key_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bindTicket.user_id, session.openid, unionid, sessionKeyHash, now, now]
      );
    }

    await db.run(
      `UPDATE wechat_miniapp_binding_tickets
       SET used_at = ?
       WHERE id = ?`,
      [now, bindTicket.id]
    );

    await db.exec('COMMIT');
    transactionOpen = false;
    return { userId: bindTicket.user_id };
  } catch (error) {
    if (transactionOpen) {
      await db.exec('ROLLBACK').catch((rollbackError) => {
        console.warn('Rollback warning (wechat_miniapp_bind):', rollbackError.message);
      });
    }
    throw error;
  }
};

module.exports = {
  WECHAT_BIND_TICKET_RE,
  WECHAT_BIND_TICKET_TTL_MS,
  WECHAT_LOGIN_CODE_RE,
  bindWechatMiniappIdentity,
  createBindingTicket,
  createPublicError,
  exchangeWechatLoginCode,
  findBoundWechatMiniappUser,
  hashValue,
};
