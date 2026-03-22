"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function RealtimeRefresh({
  channels
}: {
  channels: Array<{
    schema: string;
    table: string;
    filter?: string;
  }>;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const activeChannels = channels.map((channel, index) =>
      supabase
        .channel(`${channel.table}-${index}-${channel.filter ?? "all"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: channel.schema,
            table: channel.table,
            filter: channel.filter
          },
          () => {
            router.refresh();
          }
        )
        .subscribe()
    );

    return () => {
      activeChannels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [channels, router]);

  return null;
}
