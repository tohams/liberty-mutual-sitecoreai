import "./globals.css";
import RouteScroll from "src/features/navigation/RouteScroll";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://edge-platform.sitecorecloud.io" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <RouteScroll />
        {children}
      </body>
    </html>
  );
}
