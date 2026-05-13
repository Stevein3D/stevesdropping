import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Header } from '@/components/ui/Header'
import './globals.css'
import BackToTopButton from '@/components/ui/BackToTopButton'

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

// Used for prominent numerals (stat values, episode numbers). Only one weight (400)
// is published, but the face itself reads as a bold display serif.
const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif-display',
})

const SITE_NAME = 'Stevesdropping'
const SITE_DESCRIPTION = 'A database cataloging every Steve and Steven across film, television, and beyond.'

export const metadata: Metadata = {
  metadataBase: new URL('https://stevesdropping.com'),
  title: {
    default: 'Stevesdropping — All Steves, All the Time',
    template: '%s — Stevesdropping',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Stevesdropping — All Steves, All the Time',
    description: SITE_DESCRIPTION,
    url: 'https://stevesdropping.com',
    images: ['/apple-icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stevesdropping — All Steves, All the Time',
    description: SITE_DESCRIPTION,
    images: ['/apple-icon.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');})();` }} />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} ${dmSerifDisplay.variable} font-sans antialiased bg-cream text-warm-900 dark:bg-warm-800 dark:text-warm-200 min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
          {children}
        </main>
        <BackToTopButton />
        <footer className="border-t border-cream-border dark:border-warm-700 px-6 py-6 mt-20 text-center text-xs text-warm-600 dark:text-warm-500">
          Stevesdropping — All Steves, All the Time
        </footer>
      </body>
    </html>
  )
}
