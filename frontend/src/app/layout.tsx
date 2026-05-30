import './globals.css';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';

export const metadata = {
  title: 'ConnectSphere — Video Conferencing & Team Collaboration',
  description: 'A premium, real-time collaboration space featuring HD multi-party WebRTC video calling, workspaces, channel chats, and calendars.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Outfit Google Font for a premium tech visual look */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;705;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#F3F3F3] dark:bg-[#0B0F19] text-[#242424] dark:text-slate-100 min-h-screen font-sans">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}