import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LocalLore",
  description: "Love local. Remember deeply.",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-black">
      <body className={`${inter.className} bg-black antialiased overflow-x-hidden`}>
        <AuthProvider>
          <main className="pb-16 sm:pb-20 min-h-screen">
            {children}
          </main>
          <Navigation />
        </AuthProvider>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#1f1f1f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            },
          }}
        />
      </body>
    </html>
  );
}
