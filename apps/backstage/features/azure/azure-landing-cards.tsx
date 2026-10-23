"use client";

import {
  AppstoreOutlined,
  BranchesOutlined,
  FileSearchOutlined,
  PullRequestOutlined,
} from "@ant-design/icons";
import { Card } from "antd";
import Link from "next/link";

export function AzureLandingCards(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/azure/board">
        <Card hoverable title="Sprint board">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <AppstoreOutlined />
            See the current Team Sprinter sprint, who is on each PBI, and the taskboard.
          </div>
        </Card>
      </Link>
      <Link href="/azure/sprints">
        <Card hoverable title="Sprints">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <BranchesOutlined />
            Browse team iterations and the work items assigned to each sprint.
          </div>
        </Card>
      </Link>
      <Link href="/azure/pull-requests">
        <Card hoverable title="Pull requests">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <PullRequestOutlined />
            Look up every pull request linked to a set of work items and build a
            cherry-pick command.
          </div>
        </Card>
      </Link>
      <Link href="/azure/work-item-drafts">
        <Card hoverable title="Work item drafts">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <FileSearchOutlined />
            Review SQL performance investigations and publish Product Backlog
            Items to Azure DevOps.
          </div>
        </Card>
      </Link>
    </div>
  );
}
