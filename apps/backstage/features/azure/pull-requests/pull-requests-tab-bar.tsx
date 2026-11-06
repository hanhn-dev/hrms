"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "antd";
import type { PullRequestsTab } from "@/features/azure/pull-requests/pull-requests-tab";

export function PullRequestsTabBar({ active }: { active: PullRequestsTab }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Tabs
      activeKey={active}
      className="mb-0"
      items={[
        { key: "search", label: "Search" },
        { key: "tracking", label: "Tracking" },
      ]}
      size="small"
      onChange={(key) => {
        const next = new URLSearchParams(searchParams.toString());
        if (key === "tracking") {
          next.set("tab", "tracking");
        } else {
          next.delete("tab");
          next.delete("teamId");
          next.delete("sprint");
          next.delete("prMode");
          next.delete("prPreset");
          next.delete("prFrom");
          next.delete("prTo");
        }
        const search = next.toString();
        startTransition(() => {
          router.push(search ? `${pathname}?${search}` : pathname);
        });
      }}
      // Disable during navigation to avoid double clicks.
      {...(pending ? { style: { pointerEvents: "none" as const, opacity: 0.7 } } : {})}
    />
  );
}
