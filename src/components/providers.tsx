import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/provider";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureProfile } from "@/lib/social/server";
import { rememberAccount } from "@/lib/accounts";
import { registerServiceWorker, syncPushIfAllowed } from "@/lib/pwa";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { RadioProvider } from "@/lib/radio";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { RadioDock } from "@/components/radio-dock";
import { IncomingCallBanner } from "@/components/incoming-call-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

function ProfileSync() {
  const { user, isPending } = useCurrentUserState();
  const { t } = useI18n();
  useEffect(() => {
    if (isPending || !user) return;
    rememberAccount(user.displayName ?? t.account, user.primaryEmail);
    syncPushIfAllowed();
    void ensureProfile({
      data: {
        displayName: user.displayName,
        email: user.primaryEmail,
        avatarUrl: user.profileImageUrl,
      },
    }).catch(() => {});
  }, [isPending, user, t.account]);
  return null;
}

function PwaBoot() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}

function DirAwareToaster() {
  const { dir } = useI18n();
  return (
    <Toaster
      theme="dark"
      dir={dir}
      position="top-center"
      toastOptions={{
        className: "font-sans",
      }}
    />
  );
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
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <RadioProvider>
              <PwaBoot />
              <ProfileSync />
              <PresenceHeartbeat />
              {children}
              <IncomingCallBanner />
              <RadioDock />
              <DirAwareToaster />
            </RadioProvider>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
