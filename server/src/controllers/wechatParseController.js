const { getDb } = require('../config/db');
const {
  scrapeWeChat,
  parseWithLLM,
  cleanWeChatUrl,
  wechatCache,
  CACHE_TTL,
  downloadWeChatImage,
} = require('../utils/wechat');

const WECHAT_URL_REGEX = /^https?:\/\/(mp\.weixin\.qq\.com|www\.weixin\.qq\.com)/i;

const recordWechatParseRun = async (result = {}, dbOverride = null) => {
  try {
    const db = dbOverride || await getDb();
    await db.run(
      `
        INSERT INTO ai_assistant_runs (
          module,
          action,
          status,
          requested_by,
          summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        'wechat_event_parser',
        'parse',
        result.status || 'completed',
        result.userId || null,
        JSON.stringify({
          cacheHit: Boolean(result.cacheHit),
          contentLength: result.contentLength || 0,
          modelUsed: result.modelUsed !== false,
          provider: result.provider || null,
          model: result.model || null,
          runtimeTelemetry: result.runtimeTelemetry || { taskCount: 0, tasks: [] },
          hasCoverImage: Boolean(result.hasCoverImage),
          category: result.category || null,
          errorCode: result.errorCode || null,
        }),
      ]
    );
  } catch {
    // Parsing must stay available even if older databases do not have AI audit tables.
  }
};

const buildErrorResponse = (error) => {
  let statusCode = 500;
  let errorMessage = error.message || 'An unexpected error occurred while parsing the WeChat article';

  if (error.message && error.message.includes('LLM_API_KEY_INVALID')) {
    statusCode = 401;
    errorMessage = 'LLM API密钥无效或已过期，请联系管理员检查配置';
  } else if (error.message && error.message.includes('LLM_RATE_LIMIT')) {
    statusCode = 429;
    errorMessage = '请求过于频繁，请稍后再试';
  }

  return {
    statusCode,
    body: {
      error: 'WeChat parse failed',
      message: errorMessage,
    },
  };
};

const parseWeChatResource = async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!WECHAT_URL_REGEX.test(url)) {
    return res.status(400).json({
      error: 'Invalid WeChat URL',
      message: 'URL must be from mp.weixin.qq.com or www.weixin.qq.com',
    });
  }

  const cleanedUrl = cleanWeChatUrl(url);

  try {
    if (wechatCache.has(cleanedUrl)) {
      const { data, timestamp } = wechatCache.get(cleanedUrl);
      if (Date.now() - timestamp < CACHE_TTL) {
        await recordWechatParseRun({
          status: 'completed',
          userId: req.user?.id,
          cacheHit: true,
          contentLength: data?.content?.length || data?.description?.length || 0,
          modelUsed: Boolean(data?.aiMeta),
          provider: data?.aiMeta?.provider,
          model: data?.aiMeta?.model,
          runtimeTelemetry: data?.aiMeta?.runtimeTelemetry,
          hasCoverImage: Boolean(data?.coverImage),
          category: data?.category,
        });
        return res.json(data);
      }
      wechatCache.delete(cleanedUrl);
    }

    const scrapedData = await scrapeWeChat(cleanedUrl);
    if (!scrapedData || !scrapedData.content) {
      await recordWechatParseRun({
        status: 'failed',
        userId: req.user?.id,
        errorCode: 'SCRAPE_EMPTY_CONTENT',
      });
      return res.status(422).json({
        error: 'Failed to extract content',
        message: 'Could not extract content from the provided URL. The article might be protected or require authentication.',
      });
    }

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

    if (!parsedData.content) {
      parsedData.content = scrapedData.content;
    }
    parsedData.title = parsedData.title || scrapedData.title || 'Untitled';
    parsedData.description = parsedData.description || scrapedData.content?.substring(0, 200) || '';

    if (scrapedData.coverImage) {
      try {
        const localImagePath = await downloadWeChatImage(scrapedData.coverImage);
        parsedData.coverImage = localImagePath || scrapedData.coverImage;
      } catch {
        parsedData.coverImage = scrapedData.coverImage;
      }
    }

    wechatCache.set(cleanedUrl, {
      data: parsedData,
      timestamp: Date.now(),
    });

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
    });

    return res.json(parsedData);
  } catch (error) {
    await recordWechatParseRun({
      status: 'failed',
      userId: req.user?.id,
      errorCode: error.code || error.message || 'WECHAT_PARSE_FAILED',
    });
    const response = buildErrorResponse(error);
    return res.status(response.statusCode).json(response.body);
  }
};

module.exports = {
  buildErrorResponse,
  parseWeChatResource,
  recordWechatParseRun,
};
