const {
  getAllowedOrigins,
  hasExplicitProductionOrigins,
  isOriginAllowed
} = require('../src/utils/cors');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = () => {
  const productionEnv = {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://tuotuzju.com',
    CORS_ALLOWED_ORIGINS: 'https://tuotuzju.com,http://118.31.78.72'
  };

  const productionOrigins = getAllowedOrigins(productionEnv);
  assert(
    productionOrigins.includes('https://tuotuzju.com'),
    'Production origin list should include the canonical domain.'
  );
  assert(
    productionOrigins.includes('http://118.31.78.72'),
    'Production origin list should include the public IP while it is supported.'
  );
  assert(
    isOriginAllowed('https://tuotuzju.com', productionOrigins),
    'Canonical domain should pass CORS validation.'
  );
  assert(
    isOriginAllowed('http://118.31.78.72', productionOrigins),
    'Configured public IP should pass CORS validation.'
  );
  assert(
    !isOriginAllowed('https://evil.example.com', productionOrigins),
    'Unknown third-party origins must still be rejected.'
  );
  assert(
    hasExplicitProductionOrigins(productionEnv),
    'Configured production env should be recognized as explicit.'
  );
  console.log('✓ Production CORS allowlist accepts configured domain and public IP only.');

  const developmentOrigins = getAllowedOrigins({
    NODE_ENV: 'development'
  });
  assert(
    isOriginAllowed('http://localhost:5180', developmentOrigins),
    'Development allowlist should keep the Vite dev origin.'
  );
  assert(
    isOriginAllowed('http://localhost:3001', developmentOrigins),
    'Development allowlist should keep the API dev origin.'
  );
  console.log('✓ Development CORS allowlist keeps the expected local origins.');
};

try {
  main();
} catch (error) {
  console.error('\nCORS verification failed.');
  console.error(error);
  process.exit(1);
}
