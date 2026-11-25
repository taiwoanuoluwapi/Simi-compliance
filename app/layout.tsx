import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata: Metadata = { title: "Simi Compliance & Digital Services | Business & Digital Support", description: "Professional assistance with business registration, corporate compliance, identity documentation support and digital business services in Nigeria." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>; }
