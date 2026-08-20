import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppProviders } from "@/components/providers";
import { siteOrigin } from "@/lib/site";
import appCss from "../styles.css?url";

const APP_NAME = "وصل";
const APP_DESC =
  "وصل تطبيق تواصل عربي: غرف دردشة، رسائل خاصة، مكالمات صوت وفيديو، قصص ومنشورات. ثبّته على هاتفك.";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const siteUrl = siteOrigin();
const ogImage = host ? `https://${host}/og.jpg` : `${siteUrl}/og.jpg`;
const xBanner = host
  ? `https://og.grok.me/v1/banner.png?host=${encodeURIComponent(host)}&title=${encodeURIComponent(APP_NAME)}&color=E8C36A`
  : undefined;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "وصل — تطبيق تواصل عربي للدردشة والغرف" },
      { name: "description", content: APP_DESC },
      { name: "robots", content: "index,follow" },
      { name: "googlebot", content: "index,follow" },
      { name: "keywords", content: "وصل, تطبيق دردشة, شات عربي, غرف صوت, مكالمة فيديو, wasl" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#08090b" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ar_AR" },
      { property: "og:url", content: siteUrl },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: "وصل — تطبيق تواصل عربي" },
      { property: "og:description", content: APP_DESC },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
      ...(xBanner
        ? [
            { property: "x:game:image", content: xBanner },
            { property: "x:game:image:width", content: "1200" },
            { property: "x:game:image:height", content: "264" },
          ]
        : []),
    ],
    links: [
      { rel: "canonical", href: `${siteUrl}/` },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="ar" dir="rtl" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AppProviders>
          <Outlet />
        </AppProviders>
        <Scripts />
      </body>
    </html>
  ),
});
