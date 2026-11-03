"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Table, Tag } from "antd";
import type { ProjectTeam, TeamMember } from "@hrms/azure-devops";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import { removeLocalTeam } from "@/features/azure/teams/queries";
import { CreateTeamButton, TeamEditor } from "@/features/azure/teams/team-editor";
import { formatDate } from "@/shared/format-date";

export function TeamsPanel({
  teams: initialTeams,
  azureTeams,
  projectMembers,
}: {
  teams: LocalTeamEntry[];
  azureTeams: ProjectTeam[];
  projectMembers: TeamMember[];
}): React.JSX.Element {
  const { message, modal } = App.useApp();
  const [teams, setTeams] = useState(initialTeams);
  const [editing, setEditing] = useState<LocalTeamEntry | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  function upsert(team: LocalTeamEntry): void {
    setTeams((current) => {
      const index = current.findIndex((entry) => entry.id === team.id);
      if (index < 0) {
        return [...current, team];
      }
      const next = [...current];
      next[index] = team;
      return next;
    });
  }

  function handleDelete(team: LocalTeamEntry): void {
    modal.confirm({
      title: `Delete “${team.name}”?`,
      content: "Progress pages that used this team will need another team selected.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await removeLocalTeam(team.id);
        setTeams((current) => current.filter((entry) => entry.id !== team.id));
        message.success("Deleted team");
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-slate-600 dark:text-slate-300">
          Local teams stay in Backstage. Pick one on{" "}
          <Link className="underline" href="/azure/progress">
            Team progress
          </Link>{" "}
          to auto-fill members.
        </p>
        <CreateTeamButton
          azureTeams={azureTeams}
          projectMembers={projectMembers}
          onSaved={(team) => {
            upsert(team);
            message.success(`Saved “${team.name}”`);
          }}
        />
      </div>

      <Table
        columns={[
          {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (value: string, row: LocalTeamEntry) => (
              <Link href={`/azure/progress?teamId=${row.id}`}>{value}</Link>
            ),
          },
          {
            title: "Azure team",
            dataIndex: "azureTeam",
            key: "azureTeam",
          },
          {
            title: "Members",
            key: "members",
            render: (_value, row: LocalTeamEntry) => (
              <div className="flex flex-wrap gap-1">
                {row.members.length === 0 ? (
                  <span className="text-slate-500">None</span>
                ) : (
                  row.members.map((member) => <Tag key={member}>{member}</Tag>)
                )}
              </div>
            ),
          },
          {
            title: "Updated",
            dataIndex: "updatedAt",
            key: "updatedAt",
            width: 180,
            render: (value: string) => formatDate(value),
          },
          {
            title: "Actions",
            key: "actions",
            width: 160,
            render: (_value, row: LocalTeamEntry) => (
              <div className="flex gap-2">
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(row);
                    setEditorOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button danger size="small" onClick={() => handleDelete(row)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
        dataSource={teams.map((team) => ({ ...team, key: team.id }))}
        locale={{ emptyText: "No local teams yet. Create one to track progress." }}
        pagination={false}
        size="small"
      />

      <TeamEditor
        azureTeams={azureTeams}
        initial={editing}
        open={editorOpen}
        projectMembers={projectMembers}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={(team) => {
          upsert(team);
          message.success(`Saved “${team.name}”`);
        }}
      />
    </div>
  );
}
