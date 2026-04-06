import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'heySynk — AI-powered customer support',
  description: 'Shared inbox, Mira AI, Knowledge Base, Campaigns and Analytics.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
