"use client";

import {
  AppstoreOutlined,
  BranchesOutlined,
  CalendarOutlined,
  DiffOutlined,
  FileSearchOutlined,
  LineChartOutlined,
  PullRequestOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";

type LandingTool = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type LandingGroup = {
  id: "plan" | "review" | "publish";
  title: string;
  summary: string;
  /** Top accent shared by every tool in the group. */
  bar: string;
  iconClass: string;
  tools: readonly LandingTool[];
};

export const azureLandingGroups: readonly LandingGroup[] = [
  {
    id: "plan",
    title: "Plan",
    summary:
      "See the current sprint, track member progress, browse iterations, and order work on a timeline that stays in Backstage.",
    bar: "bg-blue-500",
    iconClass: "text-blue-600 dark:text-blue-300",
    tools: [
      {
        href: "/azure/board",
        title: "Sprint board",
        description: "See the current Team Sprinter sprint, who is on each PBI, and the taskboard.",
        icon: AppstoreOutlined,
      },
      {
        href: "/azure/teams",
        title: "Teams",
        description:
          "Create local teams, pick the Azure DevOps team for sprints, and add members. Used by Team progress.",
        icon: TeamOutlined,
      },
      {
        href: "/azure/progress",
        title: "Team progress",
        description:
          "Pick a local team to see sprint WIP, completed counts, and velocity. Members fill in automatically.",
        icon: LineChartOutlined,
      },
      {
        href: "/azure/sprints",
        title: "Sprints",
        description: "Browse team iterations and the work items assigned to each sprint.",
        icon: BranchesOutlined,
      },
      {
        href: "/azure/roadmap",
        title: "Roadmap",
        description:
          "Place Azure DevOps work items on a timeline and drag them into the order to build them. The plan stays in Backstage.",
        icon: CalendarOutlined,
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    summary: "Find the pull requests for a set of work items, then trace commits and file diffs.",
    bar: "bg-violet-500",
    iconClass: "text-violet-600 dark:text-violet-300",
    tools: [
      {
        href: "/azure/pull-requests",
        title: "Pull requests",
        description:
          "Search PRs by work item or author, track opens per local-team member, and build a cherry-pick command.",
        icon: PullRequestOutlined,
      },
      {
        href: "/azure/git",
        title: "Git",
        description:
          "Trace who committed a change, compare two commits, and diff one file across branches.",
        icon: DiffOutlined,
      },
    ],
  },
  {
    id: "publish",
    title: "Publish",
    summary:
      "Read SQL performance drafts and send accepted ones to Azure DevOps as Product Backlog Items.",
    bar: "bg-rose-500",
    iconClass: "text-rose-600 dark:text-rose-300",
    tools: [
      {
        href: "/azure/work-item-drafts",
        title: "Work item drafts",
        description:
          "Review SQL performance investigations and publish Product Backlog Items to Azure DevOps.",
        icon: FileSearchOutlined,
      },
    ],
  },
];

export function AzureLandingCards(): React.JSX.Element {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
      {azureLandingGroups.map((group) => (
        <section
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          key={group.id}
        >
          <span aria-hidden="true" className={`h-1 shrink-0 ${group.bar}`} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <header>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {group.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{group.summary}</p>
            </header>
            <div className="flex flex-col gap-3">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    className="block rounded-md border border-slate-200 px-3 py-3 text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                    href={tool.href}
                    key={tool.href}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={`mt-0.5 text-lg ${group.iconClass}`} />
                      <span>
                        <span className="block font-medium text-slate-900 dark:text-slate-100">
                          {tool.title}
                        </span>
                        <span className="mt-1 block text-sm">{tool.description}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
