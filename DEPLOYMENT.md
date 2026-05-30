# Deploying ConnectSphere to Production

ConnectSphere has a dual architecture:
1. **Frontend**: A Next.js App Router project (`frontend/`)
2. **Backend**: An Express.js & Socket.IO signaling/API server (`backend/`)

Because of this, we use a hybrid deployment strategy:
- **Frontend (Vercel)**: Fast, serverless, and optimized for Next.js.
- **Backend (Render, Railway, or Fly.io)**: A persistent, stateful container/virtual-machine host to support persistent TCP connections for **Socket.IO (WebRTC signaling)**.
- **Database (Supabase or Neon)**: A managed cloud PostgreSQL instance.

---

## ⚠️ Why Can't the Backend Run on Vercel?
Vercel is built entirely on **Serverless Functions** (AWS Lambda under the hood). Serverless functions:
1. Have a strict execution time limit (usually 10–15 seconds on the free tier).
2. Spin down and terminate when there are no incoming HTTP requests.
3. **Do not support persistent TCP/WebSocket connections.**

Since ConnectSphere uses **Socket.IO** to orchestrate real-time video/audio connections (WebRTC signaling), the backend requires a persistent, always-running server to keep WebSocket channels open.

---

## Step 1: Set Up Your PostgreSQL Database

We recommend using **Supabase** or **Neon** for a free/low-cost managed PostgreSQL database.

### Using Neon (Recommended)
1. Go to [neon.tech](https://neon.tech/) and sign up.
2. Create a new project named `connectsphere`.
3. Copy your database connection string (URL) which looks like this:
   `postgresql://neondb_owner:xxxxxx@ep-cool-breeze-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Keep this connection string safe for the backend configuration.

---

## Step 2: Deploy the Backend (to Render or Railway)

We will use **Render** (render.com) for this guide, but **Railway** is also a great option.

### Setup Render Service
1. Sign up on [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing the ConnectSphere project.
4. Set the following configuration settings:
   - **Name**: `connectsphere-backend`
   - **Environment**: `Node`
   - **Root Directory**: `connectsphere/backend` (or `backend` depending on your repository structure)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free (or Starter for CPU/Memory boost and to prevent sleeping)

### Configure Environment Variables on Render
Under the **Environment** tab of your Render Web Service, add the following key-value pairs:
- `DATABASE_URL` = `<Your Neon/Supabase Connection String>`
- `JWT_ACCESS_SECRET` = `<Generate a random secure string>`
- `JWT_REFRESH_SECRET` = `<Generate a random secure string>`
- `JWT_ACCESS_EXPIRY` = `15m`
- `JWT_REFRESH_EXPIRY` = `7d`
- `PORT` = `10000` (Render handles the port mapping automatically)
- `NODE_ENV` = `production`
- `FRONTEND_URL` = `<Your Vercel Deployment URL>` *(You can update this after Step 3)*
- `SMTP_HOST` = `smtp.gmail.com` *(Optional for OTP)*
- `SMTP_PORT` = `587`
- `SMTP_USER` = `<Your email>`
- `SMTP_PASS` = `<Your Gmail App Password>`
- `EMAIL_FROM` = `"ConnectSphere" <your-email@gmail.com>`

### Initialize & Run Database Migrations on Render
To create the database schemas on your cloud PostgreSQL instance:
1. In your local terminal, navigate to the `backend` directory.
2. Make sure your local `.env` file points to the production `DATABASE_URL` (temporarily) OR run the migration script by injecting the variable:
   ```bash
   # Windows (PowerShell)
   $env:DATABASE_URL="your-production-db-url"; npm run db:migrate
   
   # Linux/macOS
   DATABASE_URL="your-production-db-url" npm run db:migrate
   ```
3. Alternatively, you can add a **Build Filter** or **Migration Command** in Render:
   - Command: `npm run db:migrate && npm run build` (so that migrations execute automatically on every deployment).

---

## Step 3: Deploy the Frontend to Vercel

1. Go to [Vercel](https://vercel.com/) and sign up / log in.
2. Click **Add New** -> **Project**.
3. Select your GitHub repository.
4. In the configuration options:
   - **Root Directory**: Select `connectsphere/frontend` (click Edit to select the subfolder if your project is a monorepo).
   - **Framework Preset**: `Next.js` (automatically detected).
   - **Build Command**: Keep default (`next build`).
   - **Output Directory**: Keep default (`.next`).
5. Open the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-app-name>.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://<your-render-app-name>.onrender.com`
6. Click **Deploy**.

---

## Step 4: Link Frontend and Backend (CORS Configuration)

Once your Vercel site is deployed, you will get a production URL (e.g. `https://connect-sphere-six.vercel.app`).

1. Go back to your **Render Dashboard** for `connectsphere-backend`.
2. Navigate to **Environment**.
3. Update the `FRONTEND_URL` environment variable value to match your Vercel URL (e.g., `https://connect-sphere-six.vercel.app`).
4. Save the changes. Render will automatically redeploy your backend.

---

## Verification & Testing
1. Visit your Vercel deployment URL.
2. Open the browser dev tools (F12) Console to ensure there are no WebSocket CORS connection errors.
3. Try creating a workspace, inviting a teammate, or launching an **Instant Meet**.
4. Enjoy your always-running cloud instance of ConnectSphere!
