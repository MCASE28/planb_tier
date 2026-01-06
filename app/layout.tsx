import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'PlanB Tier Game',
  description: 'Host & Player Slot Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='ko'>
      <body className='min-h-screen'>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
