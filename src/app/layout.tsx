import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'
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
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased bg-cream text-warm-900 dark:bg-warm-800 dark:text-warm-200 min-h-screen`}>
        <header className="border-b-2 border-steve px-6 py-4 bg-cream dark:bg-warm-800">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="font-serif text-2xl font-black text-steve tracking-tight">
              Stevesdropping
            </a>
            <nav className="flex items-center gap-6 text-sm text-warm-600 dark:text-warm-500">
              <a href="/people"     className="hover:text-steve transition-colors">People</a>
              <a href="/characters" className="hover:text-steve transition-colors">Characters</a>
              <a href="/titles"     className="hover:text-steve transition-colors">Titles</a>
              <DarkModeToggle />
            </nav>
          </div>
        </header>
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
