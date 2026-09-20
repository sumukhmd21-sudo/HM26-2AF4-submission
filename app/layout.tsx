import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mysuru Gov Complaint Portal",
  description:
    "Register and track civic complaints for the city of Mysuru. A cleaner, safer, better Mysuru — together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen text-white antialiased">{children}</body>
    </html>
  );
}
