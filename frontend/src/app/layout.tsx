import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import { ComparisonQueueProvider } from "@/context/ComparisonQueueContext";

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
          <ComparisonQueueProvider>{children}</ComparisonQueueProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
