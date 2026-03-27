import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { Header } from '@/components/ui/Header'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Stevesdropping — All Steves, All the Time',
  description: 'A database cataloging every Steve and Steven across film, television, and beyond.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');})();` }} />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased bg-cream text-warm-900 dark:bg-warm-800 dark:text-warm-200 min-h-screen`}>
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-cream-border dark:border-warm-700 px-6 py-6 mt-20 text-center text-xs text-warm-500">
          Stevesdropping — All Steves, All the Time
        </footer>
      </body>
    </html>
  )
}
