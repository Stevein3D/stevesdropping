import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Stevesdropping — A Database of Steves',
  description: 'A database cataloging actors, celebrities, and characters named Steve across film and television.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-white hover:text-sky-400 transition-colors">
              Stevesdropping
            </a>
            <nav className="flex gap-6 text-sm text-gray-400">
              <a href="/people" className="hover:text-white transition-colors">People</a>
              <a href="/characters" className="hover:text-white transition-colors">Characters</a>
              <a href="/titles" className="hover:text-white transition-colors">Titles</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-gray-800 px-6 py-6 mt-20 text-center text-xs text-gray-600">
          Stevesdropping — All Steves, All the Time
        </footer>
      </body>
    </html>
  )
}
