import localFont from 'next/font/local';
import "./globals.css";

const geomini = localFont({
  src: './fonts/Geomini-Variable.woff2',
  display: 'swap',
  variable: '--font-geomini',
});

export const metadata = {
  title: "SELEKSIA - Computer Based Test",
  description:
    "Sistem CBT (Computer Based Test) psikotes dengan pengawasan kamera dan fitur anti-kecurangan.",
  icons: {
    icon: [
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geomini.variable} ${geomini.className} antialiased min-h-screen bg-bg-light`}
      >
        {children}
      </body>
    </html>
  );
}
