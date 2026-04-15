const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5180',
  'http://localhost:3000',
  'http://localhost:3001'
];

const DEFAULT_PRODUCTION_FALLBACK_ORIGINS = [
  'https://tuotuzju.com',
  'http://118.31.78.72'
];

const normalizeOrigin = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
};

const splitOriginList = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
};

const uniq = (values) => Array.from(new Set(values));

const hasExplicitProductionOrigins = (env = process.env) => (
  splitOriginList(env.CORS_ALLOWED_ORIGINS).length > 0
  || splitOriginList(env.CORS_ORIGIN).length > 0
  || splitOriginList(env.FRONTEND_URL).length > 0
);

const getAllowedOrigins = (env = process.env) => {
  const nodeEnv = env.NODE_ENV || 'development';
  const explicitOrigins = uniq([
    ...splitOriginList(env.CORS_ALLOWED_ORIGINS),
    ...splitOriginList(env.CORS_ORIGIN),
    ...splitOriginList(env.FRONTEND_URL)
  ]);

  if (nodeEnv === 'production') {
    return explicitOrigins.length > 0
      ? explicitOrigins
      : DEFAULT_PRODUCTION_FALLBACK_ORIGINS;
  }

  return uniq([
    ...explicitOrigins,
    ...DEFAULT_DEV_ORIGINS
  ]);
};

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return allowedOrigins.includes(normalizedOrigin);
};

module.exports = {
  DEFAULT_DEV_ORIGINS,
  DEFAULT_PRODUCTION_FALLBACK_ORIGINS,
  normalizeOrigin,
  splitOriginList,
  hasExplicitProductionOrigins,
  getAllowedOrigins,
  isOriginAllowed
};
