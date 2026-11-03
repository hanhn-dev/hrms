"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Space, Tag } from "antd";
import type { ProjectTeam, TeamMember } from "@hrms/azure-devops";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import {
  saveLocalTeam,
  searchAzureIdentities,
} from "@/features/azure/teams/queries";
import { SearchSelect } from "@/shared/ui";

export function TeamEditor({
  open,
  initial,
  azureTeams,
  projectMembers,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: LocalTeamEntry | null;
  azureTeams: readonly ProjectTeam[];
  projectMembers: readonly TeamMember[];
  onClose: () => void;
  onSaved: (team: LocalTeamEntry) => void;
}): React.JSX.Element {
  const [name, setName] = useState("");
  const [azureTeam, setAzureTeam] = useState(DEFAULT_BOARD_TEAM);
  const [members, setMembers] = useState<string[]>([]);
  const [searchHits, setSearchHits] = useState<TeamMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(initial?.name ?? "");
    setAzureTeam(initial?.azureTeam ?? DEFAULT_BOARD_TEAM);
    setMembers(initial?.members ?? []);
    setSearchHits([]);
    setMemberQuery("");
    setError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = memberQuery.trim();
    if (trimmed.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      void searchAzureIdentities(trimmed)
        .then((hits) => {
          if (!cancelled) {
            setSearchHits(hits);
          }
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setSearchHits([]);
            setError(reason instanceof Error ? reason.message : "Could not search identities");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, memberQuery]);

  const trimmedQuery = memberQuery.trim().toLowerCase();
  const rosterByName = new Map<string, string>();
  for (const person of projectMembers) {
    if (
      trimmedQuery.length < 2 ||
      person.displayName.toLowerCase().includes(trimmedQuery)
    ) {
      rosterByName.set(person.displayName, person.displayName);
    }
  }
  for (const person of searchHits) {
    rosterByName.set(person.displayName, person.displayName);
  }

  const addOptions = [...rosterByName.keys()]
    .filter((displayName) => !members.includes(displayName))
    .sort((left, right) => left.localeCompare(right))
    .map((displayName) => ({ label: displayName, value: displayName }));

  async function handleSave(): Promise<void> {
    setError(null);
    setPending(true);
    try {
      const saved = await saveLocalTeam({
        id: initial?.id ?? null,
        name,
        azureTeam,
        members,
      });
      onSaved(saved);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save team");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      destroyOnHidden
      okButtonProps={{ disabled: name.trim().length === 0 || azureTeam.trim().length === 0 }}
      okText="Save"
      open={open}
      title={initial == null ? "Create team" : "Edit team"}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={() => void handleSave()}
    >
      <Form layout="vertical">
        <Form.Item label="Team name" required>
          <Input
            placeholder="e.g. Core delivery"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Form.Item>
        <Form.Item
          label="Azure DevOps team"
          required
          extra="Used only to load sprints and work items on Team progress."
        >
          <SearchSelect
            className="w-full"
            options={azureTeams.map((team) => ({
              label: team.name,
              value: team.name,
            }))}
            placeholder="Azure team"
            value={azureTeam || undefined}
            onChange={(value: string | null) => {
              setAzureTeam(value ?? "");
            }}
          />
        </Form.Item>
        <Form.Item
          label="Members"
          extra="Project users plus Azure DevOps identity search (type at least 2 characters)."
        >
          <Space direction="vertical" className="w-full">
            <SearchSelect
              allowClear
              className="w-full"
              filterOption={false}
              key={`add-${members.join("|")}`}
              notFoundContent={
                searching
                  ? "Searching…"
                  : memberQuery.trim().length < 2
                    ? "Type at least 2 characters to search Azure DevOps"
                    : "No matching people"
              }
              options={addOptions}
              placeholder="Search people in Azure DevOps"
              value={null}
              onChange={(value: string | null) => {
                if (value && !members.includes(value)) {
                  setMembers([...members, value]);
                }
                setMemberQuery("");
                setSearchHits([]);
              }}
              onSearch={(value: string) => {
                setMemberQuery(value);
              }}
            />
            <div className="flex flex-wrap gap-1">
              {members.length === 0 ? (
                <span className="text-sm text-slate-500">No members yet.</span>
              ) : (
                members.map((member) => (
                  <Tag
                    closable
                    key={member}
                    onClose={(event) => {
                      event.preventDefault();
                      setMembers(members.filter((entry) => entry !== member));
                    }}
                  >
                    {member}
                  </Tag>
                ))
              )}
            </div>
          </Space>
        </Form.Item>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Form>
    </Modal>
  );
}

export function CreateTeamButton({
  azureTeams,
  projectMembers,
  onSaved,
}: {
  azureTeams: readonly ProjectTeam[];
  projectMembers: readonly TeamMember[];
  onSaved: (team: LocalTeamEntry) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        Create team
      </Button>
      <TeamEditor
        azureTeams={azureTeams}
        initial={null}
        open={open}
        projectMembers={projectMembers}
        onClose={() => setOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}
