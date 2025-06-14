const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://8.133.4.100:5000', // 你的Flask后端地址
        changeOrigin: true,
        secure: false
      }
    }
  }
})