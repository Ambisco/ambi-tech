# AMBI TECH website (frontend + backend)

One Node.js project that serves the website **and** its backend:

| Part | What it does |
|---|---|
| `public/index.html` | The website: Home, About, Services, IT Service, Repairs (with repair checker), Shop, Portfolio, contact form |
| `public/admin/index.html` | Your admin dashboard at `/admin/` (orders, enquiries, products, portfolio projects) |
| `server.js` + `src/` | The backend: API, SQLite database, admin login, order and payment handling |
| `test/api.test.js` | Automatic checks of the backend (`npm test`) |
| `deploy/` | Ready-made files for going live (Nginx, PM2, backups) |

**What the backend does for you**

- Stores every **order** and **enquiry** from the website so nothing is lost on WhatsApp.
- Shop products and portfolio projects come from the database, and you edit them in the admin dashboard. No code changes needed.
- Calculates order totals on the server from your real prices, so customers cannot change a price in their browser.
- Customers can **track an order** with its reference and their phone number.
- Optional: emails you for each new order and enquiry, and online payment with **Paystack**.

---

## Part 1. Run it on your own computer

You need **Node.js 22 or newer** (the current LTS is best). Get it from <https://nodejs.org> (click the "LTS" button and install with the defaults).

1. **Unzip** the project and open a terminal in the `ambi-tech` folder.
   - Windows: open the folder, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder, "New Terminal at Folder".
2. **Install the parts it needs** (needs internet, takes about a minute):
   ```
   npm install
   ```
3. **Create your settings file.** Copy `.env.example` to a new file named `.env`:
   - Windows: `copy .env.example .env`
   - Mac/Linux: `cp .env.example .env`
4. **Open `.env` in Notepad (or any text editor) and set at least these:**
   - `ADMIN_PASSWORD`: a real password, 10 or more characters.
   - `SESSION_SECRET`: a long random string. Make one with:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `SITE_WA`, `SITE_PHONE`, `SITE_EMAIL`, `SITE_ADDRESS`, `SITE_HOURS`: your real business details. `SITE_WA` is your WhatsApp number as digits only with country code, for example `2348012345678`.
5. **Start the site:**
   ```
   npm start
   ```
   The site refuses to start if the password or secret is missing, and tells you what to fix.
6. **Open it in your browser:**
   - Website: <http://localhost:3000>
   - Admin: <http://localhost:3000/admin/> (sign in with your `ADMIN_PASSWORD`)
7. **Try it:** add a product to the basket and place an order, send an enquiry from the contact form, then look for both in the admin dashboard.
8. Stop the site any time with `Ctrl + C`.

**Check that everything works** (optional): `npm test` runs the automatic checks and should end with `fail 0`.

### First things to do in the admin dashboard

The site starts with **sample products and projects** so it is not empty. The dashboard shows a yellow warning until you remove them.

1. **Products tab:** edit or delete the samples and add your real stock, prices and photo links.
2. **Projects tab:** replace the sample projects with real ones (or delete them).
3. Check the site's **Repairs, Services and IT Service** wording. That text lives in `public/index.html`. Open it and search for `SERVICES`, `ITSERV`, `REPAIRS` and `TREE` to edit it.

To start with an empty shop instead, set `SEED_SAMPLES=false` in `.env` **before the first run**.

---

## Part 2. Put it on the internet

Because the site has a backend and a database, it needs a host that runs **Node.js 22 or newer**. A plain "upload your HTML" website host will not work for the backend. Pick one option:

| | Best for | Monthly cost (roughly) | Difficulty |
|---|---|---|---|
| **A. VPS server** | Most reliable, full control, data is safe | $5 to $6 | Medium (copy and paste commands) |
| **B. Render.com** | No server to look after | about $7 plus a small disk | Easy |
| **C. cPanel hosting with Node.js** | If you already pay for Nigerian shared hosting | what you already pay | Easy but can fail (see note) |

You will also want a **domain name** (for example `ambitech.com.ng` or `ambitech.com`) from any registrar.

### Before any option: settings for the live site

In the live `.env` (or the host's "environment variables" screen) set:

```
NODE_ENV=production
BASE_URL=https://your-domain.com
TRUST_PROXY=1
ADMIN_PASSWORD=...        (a new, strong password, not the one from your computer)
SESSION_SECRET=...        (a new random string)
SITE_WA / SITE_PHONE / SITE_EMAIL / SITE_ADDRESS / SITE_HOURS
```

`BASE_URL` must be your real `https://` address. `TRUST_PROXY=1` is needed when the site sits behind Nginx, Render or similar.

---

### Option A. Deploy on a VPS (Ubuntu 22.04 or 24.04)

Good providers: DigitalOcean, Hetzner, Vultr, Contabo. Choose the cheapest plan (1 GB RAM is enough) and **Ubuntu** as the system.

**1. Point your domain at the server.** At your domain registrar add two DNS records:
- `A` record, name `@`, value = your server's IP address
- `A` record, name `www`, value = your server's IP address

**2. Connect to the server** (replace the IP):
```
ssh root@YOUR_SERVER_IP
```

**3. Basic setup and firewall:**
```
apt update && apt upgrade -y
apt install -y nginx git ufw
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

**4. Install Node.js 22:**
```
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
```

**5. Upload the project.** From your own computer (not the server), in the folder that holds `ambi-tech.zip`:
```
scp ambi-tech.zip root@YOUR_SERVER_IP:/root/
```
Back on the server:
```
apt install -y unzip
mkdir -p /var/www && unzip /root/ambi-tech.zip -d /var/www
cd /var/www/ambi-tech
npm install --omit=dev
```

**6. Create the live settings:**
```
cp .env.example .env
nano .env
```
Fill in the values from "settings for the live site" above. In nano: `Ctrl + O`, Enter to save, `Ctrl + X` to leave.

**7. Run it with PM2** (keeps it running and restarts it after a reboot):
```
npm install -g pm2
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```
Run the command that `pm2 startup` prints, then `pm2 save` again. Check: `curl http://127.0.0.1:3000/healthz` should print `{"ok":true}`.

**8. Set up Nginx** (replace `example.com` with your domain in the file first):
```
cp deploy/nginx.conf /etc/nginx/sites-available/ambitech
nano /etc/nginx/sites-available/ambitech
ln -s /etc/nginx/sites-available/ambitech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

**9. Switch on HTTPS** (free certificate; your DNS records from step 1 must have spread, which can take up to a few hours):
```
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```
Choose to redirect HTTP to HTTPS when asked. Certificates renew by themselves.

**10. Open `https://your-domain.com` and `https://your-domain.com/admin/`.** Done.

**Daily backups** (the database is one file, so back it up):
```
crontab -e
```
Add this line (runs at 2 am every day, keeps 14 days):
```
0 2 * * * cd /var/www/ambi-tech && ./deploy/backup.sh >> /var/log/ambi-backup.log 2>&1
```
Backups go to `/var/www/ambi-tech/backups`. Download them now and then with `scp`, so they also exist off the server.

**Updating the site later:** upload the new zip, unzip over the old folder (keep your `.env` and `data/` folder), run `npm install --omit=dev`, then `pm2 restart ambi-tech`.

---

### Option B. Deploy on Render.com

1. Put the project in a **GitHub** repository (create a free account at github.com, make a new private repository, upload the project files. Do **not** upload `.env`).
2. On <https://render.com> choose **New + > Web Service** and connect that repository.
3. Settings:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: **Starter** or higher (the free type cannot keep a disk)
4. Open **Disks > Add Disk**: name `data`, mount path `/var/data`, size 1 GB. **This is essential.** Without a disk, Render erases the database every time it restarts.
5. Open **Environment** and add every setting from the live-site list above, plus:
   ```
   DB_PATH=/var/data/ambi.db
   ```
   Set `BASE_URL` to the address Render gives you (for example `https://ambi-tech.onrender.com`), or to your own domain once connected.
6. Click **Create Web Service**. When the deploy finishes, open the address Render shows.
7. **Your own domain:** Settings > Custom Domains > add `your-domain.com`, then add the DNS records Render shows at your registrar. HTTPS is automatic.

Download your database now and then through Render's shell or by adding a scheduled backup, since the disk is your only copy.

---

### Option C. Shared hosting with cPanel "Setup Node.js App"

Some Nigerian hosts (check yours supports "Setup Node.js App", also called Passenger) can run this.

1. In cPanel, open **File Manager**, make a folder such as `ambitech` (outside `public_html`), upload `ambi-tech.zip` into it and **Extract**.
2. Open **Setup Node.js App > Create Application**: Node version **22 or higher**, mode **Production**, application root `ambitech/ambi-tech`, application URL your domain, startup file `server.js`.
3. Add the environment variables from the live-site list (in cPanel there is no `.env`, use the variables screen). Also set `DB_PATH` to a folder you can write to, for example `/home/YOURUSER/ambitech-data/ambi.db`.
4. Click **Run NPM Install**, then **Restart**.

> Note: this needs Node 22 or newer. Many shared hosts only offer older Node versions. If yours does not list 22, use Option A or B instead.

---

## Part 3. Optional features

### Email alerts for new orders and enquiries
Fill in these in `.env`, then restart the site:
```
NOTIFY_EMAIL=you@your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=AMBI TECH <you@gmail.com>
```
For Gmail, create an "App password" in your Google account security settings (you need 2-step verification on). If sending fails, the order is still saved. The problem is only written to the server log.

### Online payment with Paystack
1. Create a Paystack business account at <https://paystack.com>.
2. In **Settings > API Keys & Webhooks**, copy your **Secret key**. Start with the **test** key (starts `sk_test_`).
3. Put it in `.env` as `PAYSTACK_SECRET_KEY=sk_test_...` and restart the site. A **Pay online** button now appears in the basket.
4. In the same Paystack page set the **Webhook URL** to `https://your-domain.com/api/paystack/webhook` and save.
5. Make a test purchase with Paystack's test card. The order should change to **paid** in your admin dashboard by itself.
6. When happy, replace the key with your **live** key (`sk_live_...`) and restart.

Paystack needs a public `https://` address, so test payments on the live site, not on `localhost`.

---

## Everyday use

- **Orders tab:** change the status as you go (`new`, `paid`, `confirmed`, `delivered`, `cancelled`). Customers see this when they track their order.
- **Enquiries tab:** every contact-form message with the customer's phone or email.
- **Products tab:** add, edit, mark out of stock, or delete. Changes show on the website straight away.
- **Projects tab:** add your real jobs to the Portfolio page.

## Security notes

- Keep `.env` private. Never upload it to GitHub or send it to anyone.
- Use a strong, unique `ADMIN_PASSWORD`. Sign-in attempts are limited to 10 per 15 minutes.
- Always use HTTPS on the live site (Option A step 9 and Render do this for you).
- Make backups and keep a copy away from the server.
- Update now and then: `npm install` then `npm audit`, and keep Ubuntu updated with `apt update && apt upgrade`.

## Troubleshooting

| Problem | Fix |
|---|---|
| "The server did not start" with a list | Open `.env` and fix what it lists (usually `ADMIN_PASSWORD` or `SESSION_SECRET`) |
| "node:sqlite" not found, or the site will not start | Your Node is too old. Install Node 22 or newer (`node -v` shows the version) |
| Page shows but shop is empty | Check `/api/products` in the browser. If it errors, read the terminal where the site runs |
| Cannot sign in to admin | The password is the `ADMIN_PASSWORD` in the `.env` of the machine you are using. Restart after changing it |
| Orders vanish after a restart (Render) | You are missing the disk. See Option B step 4 |
| Site works on the server but not on your domain | DNS has not spread yet (wait up to a few hours), or Nginx `server_name` is wrong |
| Port already in use | Change `PORT` in `.env` |

## Project map

```
ambi-tech/
  server.js            starts the website and API
  src/                 backend code (database, login, orders, payments, validation)
  public/index.html    the website
  public/admin/        admin dashboard
  deploy/              Nginx, PM2 and backup files
  test/                automatic checks
  data/                the database file is created here
  .env.example         copy to .env and fill in
```
