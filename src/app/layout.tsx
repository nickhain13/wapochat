import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WaPoChat – Filmproduktion",
  description: "Internes Kommunikationstool für die Filmproduktion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className={`${geist.className} h-full bg-gray-950 antialiased`}>{children}</body>
    </html>
  );
}
