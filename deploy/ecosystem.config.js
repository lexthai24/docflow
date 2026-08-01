// PM2 process config สำหรับ DocFlow (demo)
//
// ⚠️ ห้ามใช้ pm2 delete all / pm2 kill / pm2 stop all บน server นี้
//    เพราะมีโปรเจกต์อื่นรันอยู่ — ใช้ชื่อ "docflow" เจาะจงเสมอ:
//      pm2 restart docflow   pm2 stop docflow   pm2 logs docflow
//
// รัน (ครั้งแรก): pm2 start deploy/ecosystem.config.js
// env จริงอ่านจาก .env.local ที่ Next.js โหลดเอง (ไม่ใส่ secret ที่นี่)

module.exports = {
  apps: [
    {
      name: "docflow",
      cwd: "/var/www/docflow", // แก้ให้ตรงกับ path บน server
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
      },
      error_file: "/var/log/docflow/error.log",
      out_file: "/var/log/docflow/out.log",
      time: true,
    },
  ],
};
