"use client";

import {
  AppstoreOutlined,
  BranchesOutlined,
  CalendarOutlined,
  DiffOutlined,
  FileSearchOutlined,
  PullRequestOutlined,
} from "@ant-design/icons";
import { Card } from "antd";
import Link from "next/link";

type LandingCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Card fill and border. */
  frame: string;
  /** Left accent strip, one color per card. */
  bar: string;
  /** Header band, stronger than the body so the title reads first. */
  header: string;
  titleClass: string;
  iconClass: string;
};

export const azureLandingCards: readonly LandingCard[] = [
  {
    href: "/azure/board",
    title: "Sprint board",
    description: "See the current Team Sprinter sprint, who is on each PBI, and the taskboard.",
    icon: AppstoreOutlined,
    frame: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/55",
    bar: "bg-blue-500",
    header: "!border-b-blue-200 !bg-blue-100 dark:!border-b-blue-800 dark:!bg-blue-900/70",
    titleClass: "!text-blue-900 dark:!text-blue-100",
    iconClass: "text-blue-600 dark:text-blue-300",
  },
  {
    href: "/azure/sprints",
    title: "Sprints",
    description: "Browse team iterations and the work items assigned to each sprint.",
    icon: BranchesOutlined,
    frame: "border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/55",
    bar: "bg-cyan-500",
    header: "!border-b-cyan-200 !bg-cyan-100 dark:!border-b-cyan-800 dark:!bg-cyan-900/70",
    titleClass: "!text-cyan-900 dark:!text-cyan-100",
    iconClass: "text-cyan-600 dark:text-cyan-300",
  },
  {
    href: "/azure/roadmap",
    title: "Roadmap",
    description:
      "Place Azure DevOps work items on a timeline and drag them into the order to build them. The plan stays in Backstage.",
    icon: CalendarOutlined,
    frame: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    bar: "bg-amber-500",
    header: "!border-b-amber-200 !bg-amber-100 dark:!border-b-amber-800 dark:!bg-amber-900/70",
    titleClass: "!text-amber-950 dark:!text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-300",
  },
  {
    href: "/azure/pull-requests",
    title: "Pull requests",
    description:
      "Look up every pull request linked to a set of work items and build a cherry-pick command.",
    icon: PullRequestOutlined,
    frame: "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/55",
    bar: "bg-violet-500",
    header: "!border-b-violet-200 !bg-violet-100 dark:!border-b-violet-800 dark:!bg-violet-900/70",
    titleClass: "!text-violet-900 dark:!text-violet-100",
    iconClass: "text-violet-600 dark:text-violet-300",
  },
  {
    href: "/azure/git",
    title: "Git",
    description: "Trace who committed a change, compare two commits, and diff one file across branches.",
    icon: DiffOutlined,
    frame: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
    bar: "bg-emerald-500",
    header: "!border-b-emerald-200 !bg-emerald-100 dark:!border-b-emerald-800 dark:!bg-emerald-900/70",
    titleClass: "!text-emerald-900 dark:!text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-300",
  },
  {
    href: "/azure/work-item-drafts",
    title: "Work item drafts",
    description:
      "Review SQL performance investigations and publish Product Backlog Items to Azure DevOps.",
    icon: FileSearchOutlined,
    frame: "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/50",
    bar: "bg-rose-500",
    header: "!border-b-rose-200 !bg-rose-100 dark:!border-b-rose-800 dark:!bg-rose-900/70",
    titleClass: "!text-rose-900 dark:!text-rose-100",
    iconClass: "text-rose-600 dark:text-rose-300",
  },
];

export function AzureLandingCards(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {azureLandingCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            className={`block h-full overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md ${card.frame}`}
            href={card.href}
            key={card.href}
          >
            <div className="flex h-full">
              <span aria-hidden="true" className={`w-1.5 shrink-0 ${card.bar}`} />
              <Card
                className="min-w-0 flex-1 !bg-transparent !shadow-none"
                classNames={{
                  header: card.header,
                  title: card.titleClass,
                  body: "!bg-transparent",
                }}
                title={card.title}
                variant="borderless"
              >
                <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                  <Icon className={`mt-0.5 text-lg ${card.iconClass}`} />
                  <span>{card.description}</span>
                </div>
              </Card>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
