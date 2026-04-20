// PM2 生产环境配置
module.exports = {
  apps: [{
    name: 'tingstudio-backend',
    script: './dist/index.js',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 性能配置
    max_memory_restart: '1G', // 内存超过1G时重启
    // 监控和重启
    watch: false, // 生产环境不监听文件变化
    ignore_watch: ['node_modules', 'logs'],
    // 优雅重启
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 5000,
    // 健康检查
    health_check_url: 'http://localhost:3000/health',
    health_check_interval: 30000, // 30秒检查一次
    // 自动重启
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};