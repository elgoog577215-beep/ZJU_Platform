const {
  cancelLogin,
  fetchArticleContent,
  fetchArticles,
  getStatus,
  searchAccounts,
  startLogin,
} = require('../services/wechatMpAdminService');
const {
  downloadWeChatImage,
  parseWithLLM,
} = require('../utils/wechat');
const { recordWechatParseRun } = require('./wechatParseController');

const toHttpStatus = (error) => {
  if (Number.isInteger(error?.status)) return error.status;
  if (error?.code === 'WECHAT_MP_AUTH_REQUIRED') return 401;
  if (error?.code === 'PLAYWRIGHT_CHROMIUM_MISSING') return 503;
  return 500;
};

const sendError = (res, error, fallback = '微信 MP 操作失败') => {
  const status = toHttpStatus(error);
  return res.status(status).json({
    error: error?.code || 'WECHAT_MP_ADMIN_ERROR',
    message: error?.message || fallback,
    runtime: error?.runtime || undefined,
  });
};

const getWechatMpStatus = (_req, res) => {
  try {
    return res.json(getStatus());
  } catch (error) {
    return sendError(res, error, '获取微信 MP 状态失败');
  }
};

const startWechatMpLogin = (req, res) => {
  try {
    const state = startLogin({
      waitSeconds: req.body?.wait_seconds,
    });
    return res.json(state);
  } catch (error) {
    return sendError(res, error, '启动微信 MP 登录失败');
  }
};

const getWechatMpLoginStatus = (_req, res) => {
  try {
    return res.json(getStatus().login);
  } catch (error) {
    return sendError(res, error, '获取微信 MP 登录状态失败');
  }
};

const cancelWechatMpLogin = async (_req, res) => {
  try {
    const state = await cancelLogin();
    return res.json(state);
  } catch (error) {
    return sendError(res, error, '取消微信 MP 登录失败');
  }
};

const searchWechatMpAccounts = async (req, res) => {
  try {
    const result = await searchAccounts({
      query: req.body?.query,
      count: req.body?.count,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, '搜索公众号失败');
  }
};

const listWechatMpArticles = async (req, res) => {
  try {
    const result = await fetchArticles({
      accountName: req.body?.account_name,
      fakeid: req.body?.fakeid,
      keyword: req.body?.keyword,
      count: req.body?.count,
      maxPages: req.body?.max_pages,
      allowFirst: req.body?.allow_first === true,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, '获取公众号文章失败');
  }
};

const getWechatMpArticleContent = async (req, res) => {
  try {
    const result = await fetchArticleContent({
      url: req.body?.url,
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, '获取微信文章正文失败');
  }
};

const parseWechatMpArticle = async (req, res) => {
  let contentPayload = req.body?.content || null;
  try {
    if (!contentPayload?.contentText && req.body?.url) {
      contentPayload = await fetchArticleContent({ url: req.body.url });
    }
    if (!contentPayload?.contentText) {
      return res.status(422).json({
        error: 'WECHAT_MP_EMPTY_CONTENT',
        message: '请先获取文章正文后再解析',
      });
    }

    const scrapedData = {
      title: contentPayload.title || req.body?.article?.title || 'Untitled',
      author: contentPayload.author || req.body?.article?.account || 'Unknown',
      content: contentPayload.contentText,
      coverImage: contentPayload.coverImage || req.body?.article?.cover || '',
    };
    const parsedData = await parseWithLLM(scrapedData);
    if (!parsedData) {
      await recordWechatParseRun({
        status: 'failed',
        userId: req.user?.id,
        contentLength: scrapedData.content.length,
        errorCode: 'LLM_EMPTY_RESULT',
      });
      return res.status(500).json({
        error: 'LLM parsing failed',
        message: 'Failed to parse content with AI. Please try again or fill in the information manually.',
      });
    }

    if (!parsedData.content) parsedData.content = scrapedData.content;
    parsedData.title = parsedData.title || scrapedData.title || 'Untitled';
    parsedData.description = parsedData.description || scrapedData.content.slice(0, 200);
    if (scrapedData.coverImage) {
      try {
        parsedData.coverImage = await downloadWeChatImage(scrapedData.coverImage) || scrapedData.coverImage;
      } catch {
        parsedData.coverImage = scrapedData.coverImage;
      }
    }

    await recordWechatParseRun({
      status: 'completed',
      userId: req.user?.id,
      cacheHit: false,
      contentLength: scrapedData.content.length,
      modelUsed: true,
      provider: parsedData.aiMeta?.provider,
      model: parsedData.aiMeta?.model,
      runtimeTelemetry: parsedData.aiMeta?.runtimeTelemetry,
      hasCoverImage: Boolean(parsedData.coverImage),
      category: parsedData.category,
      isCollegeNotice: parsedData.is_college_notice,
      noticeType: parsedData.notice_type,
      sourceCollege: parsedData.source_college,
    });

    return res.json({
      parsed: parsedData,
      source: {
        title: scrapedData.title,
        author: scrapedData.author,
        contentLength: scrapedData.content.length,
      },
    });
  } catch (error) {
    await recordWechatParseRun({
      status: 'failed',
      userId: req.user?.id,
      contentLength: contentPayload?.contentText?.length || 0,
      errorCode: error.code || error.message || 'WECHAT_MP_PARSE_FAILED',
    });
    return sendError(res, error, '解析微信文章失败');
  }
};

module.exports = {
  cancelWechatMpLogin,
  getWechatMpArticleContent,
  getWechatMpLoginStatus,
  getWechatMpStatus,
  listWechatMpArticles,
  parseWechatMpArticle,
  searchWechatMpAccounts,
  startWechatMpLogin,
};

