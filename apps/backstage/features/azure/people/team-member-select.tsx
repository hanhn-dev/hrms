"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { TeamMember } from "@hrms/azure-devops";
import {
  buildTeamMemberOptions,
  type TeamMemberValueKey,
} from "@/features/azure/people/team-member-options";
import { SearchSelect } from "@/shared/ui";

const SEARCH_DELAY_MS = 250;

type TeamMemberSelectBase = {
  roster: readonly TeamMember[];
  valueKey?: TeamMemberValueKey;
  searchPeople: (query: string) => Promise<TeamMember[]>;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  onSearchError?: (message: string) => void;
};

type TeamMemberSelectMultiple = TeamMemberSelectBase & {
  mode?: "multiple";
  value: readonly string[];
  onChange: (value: string[]) => void;
};

type TeamMemberSelectAdd = TeamMemberSelectBase & {
  mode: "add";
  excludeValues: readonly string[];
  onChange: (value: string) => void;
  /** Remount key so the add Select clears after each pick. */
  selectKey?: string;
};

export type TeamMemberSelectProps = TeamMemberSelectMultiple | TeamMemberSelectAdd;

export function TeamMemberSelect(props: TeamMemberSelectProps): React.JSX.Element {
  const {
    roster,
    valueKey = "displayName",
    searchPeople,
    placeholder = "Team member",
    className = "w-full",
    allowClear = true,
    disabled,
    onSearchError,
  } = props;
  const ariaLabel = props["aria-label"];
  const isAdd = props.mode === "add";
  const selected = isAdd ? [] : [...props.value];
  const excludeValues = isAdd ? props.excludeValues : undefined;

  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<TeamMember[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useEffectEvent((trimmed: string, isCancelled: () => boolean) => {
    void searchPeople(trimmed)
      .then((hits) => {
        if (!isCancelled()) {
          setSearchHits(hits);
        }
      })
      .catch((reason: unknown) => {
        if (!isCancelled()) {
          setSearchHits([]);
          onSearchError?.(
            reason instanceof Error ? reason.message : "Could not search identities",
          );
        }
      })
      .finally(() => {
        if (!isCancelled()) {
          setSearching(false);
        }
      });
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      runSearch(trimmed, () => cancelled);
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const options = buildTeamMemberOptions({
    roster,
    searchHits,
    selected,
    query,
    valueKey,
    excludeValues,
  });

  function clearSearch(): void {
    setQuery("");
    setSearchHits([]);
  }

  return (
    <SearchSelect
      allowClear={allowClear}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      filterOption={false}
      key={isAdd ? (props.selectKey ?? "add") : undefined}
      mode={isAdd ? undefined : "multiple"}
      notFoundContent={
        searching
          ? "Searching…"
          : query.trim().length < 2
            ? "Type at least 2 characters to search Azure DevOps"
            : "No matching people"
      }
      options={options}
      placeholder={placeholder}
      value={isAdd ? null : selected}
      onChange={(next) => {
        if (isAdd) {
          const picked = typeof next === "string" ? next : null;
          if (picked) {
            props.onChange(picked);
          }
          clearSearch();
          return;
        }
        const names = (Array.isArray(next) ? next : []).map(String);
        props.onChange(names);
        clearSearch();
      }}
      onSearch={(value) => {
        setQuery(value);
      }}
    />
  );
}
