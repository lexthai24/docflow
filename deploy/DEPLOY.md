# คู่มือ Deploy — DocFlow Demo

Deploy บน server (Ubuntu/Linux) ด้วย **Node + PM2 + nginx** ที่โดเมน `docflow.nvxthai.dev`

> ⚠️ **ความปลอดภัยกับโปรเจกต์อื่นบน server:**
> - ห้ามใช้ `pm2 delete all`, `pm2 kill`, `pm2 stop all`, `pm2 save --force` ที่กระทบทุก process
> - ใช้ชื่อ **`docflow`** เจาะจงเสมอ
> - docflow ใช้ **port 3100** (ไม่ชน 3000)
> - nginx: สร้างไฟล์ใหม่เฉพาะ docflow ไม่แตะ config เว็บอื่น

---

## 0. เตรียมเครื่อง (ทำครั้งเดียว)

SSH เข้า server:
```bash
ssh -i ~/.ssh/id_ed25519 thailotter@217.216.73.19
```

ตรวจว่ามีเครื่องมือครบ (Node 20+, pm2, nginx, git):
```bash
node -v; npm -v; pm2 -v; nginx -v; git --version
```
ถ้าขาด pm2: `sudo npm i -g pm2`

**ตรวจ process/port เดิมก่อน (กันชน):**
```bash
pm2 list                          # ดูว่ามี process อะไรอยู่ (จำไว้ อย่าไปแตะ)
sudo ss -ltnp | grep -E ':3100|:80|:443'   # 3100 ต้องว่าง
```

---

## 1. Database (Postgres มีอยู่แล้วบน 5432)

สร้าง database + user เฉพาะ docflow (ไม่ใช้ของโปรเจกต์อื่น):
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE docflow;
CREATE USER docflow_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE docflow TO docflow_user;
\c docflow
GRANT ALL ON SCHEMA public TO docflow_user;
SQL
```
> เปลี่ยน `CHANGE_THIS_STRONG_PASSWORD` เป็นรหัสจริง แล้วจำไว้ใส่ใน `.env.local` (ข้อ 3)

---

## 2. Clone โค้ด

```bash
sudo mkdir -p /var/www/docflow /var/log/docflow
sudo chown -R thailotter:thailotter /var/www/docflow /var/log/docflow
cd /var/www/docflow
git clone https://github.com/lexthai24/docflow.git .
```

---

## 3. ตั้งค่า .env.local (บน server)

```bash
cd /var/www/docflow
cp .env.example .env.local
nano .env.local
```
แก้ค่าเหล่านี้:
```bash
DATABASE_URL="postgresql://docflow_user:CHANGE_THIS_STRONG_PASSWORD@localhost:5432/docflow?schema=public"
APP_URL="https://docflow.nvxthai.dev"
NODE_ENV="production"
AUTH_SECRET="<รันคำสั่งด้านล่างเพื่อสร้าง>"

# เปิด demo login (คลิกเลือก role ได้เลย)
DEMO_MODE="true"

# บัญชี seed
SEED_ADMIN_EMAIL="admin@docflow.local"
SEED_ADMIN_PASSWORD="<ตั้งรหัส>"
SEED_USER_PASSWORD="<ตั้งรหัส>"
```
สร้าง AUTH_SECRET:
```bash
openssl rand -base64 48
```

> 💡 **Demo มี DEMO_MODE=true** → หน้า login จะมีปุ่มคลิกเลือก user ตาม role ได้เลย
> ถ้าจะปิด demo ภายหลัง: แก้เป็น `DEMO_MODE="false"` แล้ว `pm2 restart docflow`

---

## 4. Build + Database migrate + seed

```bash
cd /var/www/docflow
npm ci                 # ติดตั้ง dependencies (ตรง lockfile)
npm run db:generate    # generate Prisma client
npm run db:deploy      # apply migrations (production-safe)
npm run db:seed        # ใส่ข้อมูล demo (org, users, docs)
npm run build          # build production
```

---

## 5. รันด้วย PM2 (ใช้ชื่อ docflow เท่านั้น)

```bash
cd /var/www/docflow
# ถ้ามี docflow เดิมอยู่ ให้ลบเฉพาะตัวนี้ก่อน (ปลอดภัย ไม่กระทบอื่น):
pm2 delete docflow 2>/dev/null || true

pm2 start deploy/ecosystem.config.js
pm2 save                 # บันทึก process list (รวมของเดิมด้วย — ปลอดภัย)
pm2 startup              # ตั้งให้ start ตอน reboot (ทำครั้งเดียว รันคำสั่งที่มันบอก)
```

ตรวจว่ารันแล้ว:
```bash
pm2 list                 # ต้องเห็น docflow status = online
curl -I http://127.0.0.1:3100    # ต้องได้ HTTP response
pm2 logs docflow --lines 30      # ดู log ถ้ามีปัญหา
```

---

## 6. nginx (เฉพาะ docflow)

```bash
sudo cp /var/www/docflow/deploy/nginx-docflow.conf /etc/nginx/sites-available/docflow.nvxthai.dev
sudo ln -s /etc/nginx/sites-available/docflow.nvxthai.dev /etc/nginx/sites-enabled/
sudo nginx -t            # ตรวจ syntax (ต้องผ่านก่อน reload)
sudo systemctl reload nginx
```

> `nginx -t` ตรวจ config ทั้งหมด — ถ้าผ่านแปลว่าไม่กระทบเว็บอื่น

---

## 7. DNS + SSL

**DNS:** ชี้ A record `docflow.nvxthai.dev` → `217.216.73.19` (ทำที่ผู้ให้บริการ DNS)

รอ DNS propagate แล้วตรวจ:
```bash
dig +short docflow.nvxthai.dev    # ต้องได้ 217.216.73.19
```

**SSL (Let's Encrypt):**
```bash
sudo certbot --nginx -d docflow.nvxthai.dev
```
certbot จะเติม SSL block + redirect HTTP→HTTPS ให้อัตโนมัติ

---

## 8. เสร็จ — ทดสอบ

เปิด `https://docflow.nvxthai.dev` → หน้า login มีปุ่ม demo คลิกเลือก role ได้เลย 🎉

---

## การอัปเดตโค้ดภายหลัง (redeploy)

```bash
cd /var/www/docflow
git pull
npm ci
npm run db:generate
npm run db:deploy        # ถ้ามี migration ใหม่
npm run build
pm2 restart docflow      # restart เฉพาะ docflow
```

---

## คำสั่งดูแล (เฉพาะ docflow — ปลอดภัย)

| ต้องการ | คำสั่ง |
|---------|--------|
| ดู log | `pm2 logs docflow` |
| restart | `pm2 restart docflow` |
| stop | `pm2 stop docflow` |
| ลบ (เฉพาะตัวนี้) | `pm2 delete docflow` |
| ดูสถานะ | `pm2 show docflow` |

**อย่าใช้:** `pm2 delete all`, `pm2 kill`, `pm2 stop all` — กระทบทุกโปรเจกต์บน server

---

## Troubleshooting

- **502 Bad Gateway** → app ไม่รัน: `pm2 logs docflow`, ตรวจ `.env.local` (DATABASE_URL ถูกไหม)
- **DB connect error** → ตรวจ Postgres รันอยู่ + user/password ถูก: `psql -U docflow_user -h localhost -d docflow`
- **port 3100 ชน** → มีคนใช้อยู่: `sudo ss -ltnp | grep 3100` แล้วเปลี่ยน port ใน `deploy/ecosystem.config.js` + `nginx-docflow.conf` ให้ตรงกัน
- **demo ปุ่มไม่ขึ้น** → ตรวจ `DEMO_MODE="true"` ใน `.env.local` แล้ว `pm2 restart docflow`
