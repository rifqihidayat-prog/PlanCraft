module.exports = {
  apps: [
    {
      name: 'plancraft',
      script: 'npm',
      args: 'run start -- -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Konfigurasikan PIN produksi di sini atau gunakan file .env
        ADMIN_PIN: process.env.ADMIN_PIN || '',
        PRODUCTION_PIN: process.env.PRODUCTION_PIN || '',
      },
    },
  ],
};
