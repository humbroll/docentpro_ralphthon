import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import { ComparisonQueueProvider } from "@/context/ComparisonQueueContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "WhenToGo — Find Your Best Travel Dates",
  description:
    "Compare flight prices, hotel rates, and weather to find the optimal travel window.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <ComparisonQueueProvider>
            <AppShell>{children}</AppShell>
          </ComparisonQueueProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
