import Navbar from "@/components/Topbar";
import { StreakerProvider } from "@/context/StreakerContext";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Streaker - Keep the streak alive",
  description: "Track your daily habits, streaks and financial stakes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <StreakerProvider>
            <Navbar />
            <main>
              {children}
            </main>
          </StreakerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
