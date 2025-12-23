module.exports = {
  apps: [{
    name: "tuotu-zhexiang",
    script: "./server/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
};
