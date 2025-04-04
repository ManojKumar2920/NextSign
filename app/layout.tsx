import type { Metadata } from "next";
import "./globals.css";
import GlassmorphicNavbar from "@/components/Navbar";
import Footer from "@/components/Footer";



// Enhanced metadata with more SEO and app-specific details
export const metadata: Metadata = {
  title: {
    default: "NextSign - SignLan Interpreter",
    template: "%s | NextSign", // Dynamic title template for subpages
  },
  description:
    "Convert text or speech into sign language videos instantly with our accessible translation tool.",
  keywords: ["sign language", "translator", "accessibility", "speech-to-sign", "video"],
  authors: [{ name: "Manoj Kumar", url: "http://itsmano.netlify.app/" }],
  creator: "Manoj Kumar",
  openGraph: {
    title: "NextSign",
    description:
      "Instantly translate text or speech into sign language.",
    url: "#",
    siteName: "Sign Language Translator",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextSign",
    description:
      "Convert text or speech into sign language videos instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-screen  bg-gradient-to-br from-blue-100 to-indigo-50`}
      >
        <GlassmorphicNavbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}