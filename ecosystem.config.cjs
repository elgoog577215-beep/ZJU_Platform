module.exports = {
  apps: [{
    name: "zju-platform",
    script: "./server/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 80
    }
  }]
}
