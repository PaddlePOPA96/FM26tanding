import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FM24 Manager League',
  description: 'Mini liga 4 manager • gaya Football Manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

