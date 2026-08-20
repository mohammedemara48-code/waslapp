import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/provider";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureProfile } from "@/lib/social/server";
import { rememberAccount } from "@/lib/accounts";
import { registerServiceWorker, enableBrowserNotifications, subscribeWebPush } from "@/lib/pwa";
import { RadioProvider } from "@/lib/radio";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { RadioDock } from "@/components/radio-dock";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

function ProfileSync() {
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    if (isPending || !user) return;
    rememberAccount(user.displayName ?? "حساب", user.primaryEmail);
    void enableBrowserNotifications().then((ok) => {
      if (ok) void subscribeWebPush();
    });
    void ensureProfile({
      data: {
        displayName: user.displayName,
        email: user.primaryEmail,
        avatarUrl: user.profileImageUrl,
      },
    }).catch(() => {});
  }, [isPending, user]);
  return null;
}

function PwaBoot() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <RadioProvider>
            <PwaBoot />
            <ProfileSync />
            <PresenceHeartbeat />
            {children}
            <RadioDock />
            <Toaster
              theme="dark"
              dir="rtl"
              position="top-center"
              toastOptions={{
                className: "font-sans",
              }}
            />
          </RadioProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
