import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Infinite App',
  description: 'A Next.js app that builds itself.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
