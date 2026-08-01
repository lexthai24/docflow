import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DocFlow Enterprise",
    template: "%s · DocFlow Enterprise",
  },
  description: "ระบบจัดการเอกสารระดับองค์กร — จัดเก็บ ค้นหา อนุมัติ และติดตามเอกสาร",
};

// ป้องกัน flash ของ theme ก่อน hydration (สเปคหมวด 4)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('docflow-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning className={`${ibmPlexThai.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ className: "font-sans" }}
        />
      </body>
    </html>
  );
}
