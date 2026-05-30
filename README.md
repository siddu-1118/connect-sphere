# ConnectSphere — Video Conferencing & Collaboration Space

ConnectSphere is a full-stack virtual workspace. It enables instant HD multi-user video and audio calling, structured collaboration workspace teams, custom channels, calendar management, and secure OTP checkups — all in a single web client.

---

## Technical Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Socket.IO Client, native WebRTC APIs (`RTCPeerConnection`).
- **Backend**: Node.js, Express, TypeScript, Socket.IO (Signaling Relay), PostgreSQL, Drizzle ORM.
- **Infrastructure**: Docker & Docker Compose.

---

## Setup & Quick Start

### Prerequisites
- Node.js 20+ installed.
- Docker + Docker Compose installed.
- (Optional) Gmail account with App Passwords enabled for OTP email deliveries. If left unconfigured, ConnectSphere will fallback to printing codes in the backend terminal console logs.

### Option 1: Docker Compose (Recommended)
```bash
# Clone the repository and navigate to connectsphere
cd connectsphere

# Copy environment example
cp .env.example .env

# Spin up containers (PostgreSQL database, Node backend API, Next.js frontend app)
docker-compose up --build
```
- **App URL**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`

### Option 2: Manual Start (Development Mode)

#### Terminal 1 — Database
Run a local PostgreSQL container:
```bash
docker run --name connectsphere_db -e POSTGRES_DB=connectsphere -e POSTGRES_USER=connectsphere -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:16
```

#### Terminal 2 — Backend
Install dependencies, execute database migration scripts, and boot the server:
```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

#### Terminal 3 — Frontend
Install dependencies and run the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```

---

## Testing on External Devices (ngrok)

To test multi-party WebRTC calls on physical devices (such as smart phones or secondary laptops) outside your local machine network, follow these instructions:

1. Install ngrok globally on your machine:
   ```bash
   npm install -g ngrok
   ```
2. Start the backend: `cd backend && npm run dev` (running on port 4000).
3. Start the frontend: `cd frontend && npm run dev` (running on port 3000).
4. Open two separate terminal windows:
   - **Terminal 1**: Expose the backend signaling port:
     ```bash
     ngrok http 4000
     ```
     Copy the HTTPS URL generated (e.g. `https://abc1234.ngrok-free.app`).
   - **Terminal 2**: Expose the frontend Next.js app port:
     ```bash
     ngrok http 3000
     ```
     Copy the HTTPS URL generated (e.g. `https://xyz5678.ngrok-free.app`).
5. Update your `.env` variables:
   - Set the backend variables `FRONTEND_URL` to your frontend ngrok HTTPS URL to bypass CORS security constraints.
   - Set the frontend variables `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your backend ngrok HTTPS URL.
6. Share your frontend ngrok HTTPS URL with external testing devices.
7. Open the shared URL on the devices (make sure to grant camera and microphone access prompts).
8. Register accounts, sign in, click **"New Instant Meet"**, and share the meeting room code (format: `xxx-xxxx-xxx`) with the secondary device.
9. Connect from both screens. Both participants will see and hear each other in real-time inside the shared room!

---

## Database Migrations

Whenever you update the schemas in `backend/src/db/schema.ts`, regenerate and execute migrations using:
```bash
cd backend
npm run db:migrate
```
