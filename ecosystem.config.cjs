module.exports = {
  apps: [{
    name: "lumos-portfolio",
    script: "./server/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
}
