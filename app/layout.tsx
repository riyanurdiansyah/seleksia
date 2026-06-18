import { Montserrat } from 'next/font/google';
import "./globals.css";

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata = {
  title: "SELEKSIA - Computer Based Test",
  description:
    "Sistem CBT (Computer Based Test) psikotes dengan pengawasan kamera dan fitur anti-kecurangan.",
  icons: {
    icon: "/full-logo-only.png",
  },
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
        className={`${montserrat.className} antialiased min-h-screen bg-bg-light`}
      >
        {children}
      </body>
    </html>
  );
}
