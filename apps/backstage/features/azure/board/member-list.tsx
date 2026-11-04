"use client";

import { Card } from "antd";
import type { PersonWork } from "@/features/azure/board/group-board";
import { ChildList, ParentLink, WorkItemStateTag, WorkItemTypeTag } from "@/features/azure/board/work-item-tags";
import { StaleStatusBadge } from "@/features/azure/stale";
import { HighlightMatch } from "@/shared/ui";

export function MemberList({
  people,
  query,
  staleDaysById = new Map(),
  onOpenWorkItem,
}: {
  people: PersonWork[];
  query?: string;
  staleDaysById?: ReadonlyMap<number, number | null>;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  if (people.length === 0) {
    return <p className="text-slate-500">No one is assigned work that matches.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {people.map((person) => (
        <Card key={person.displayName} size="small" title={person.displayName}>
          <div className="mb-3">
            <div className="mb-1 text-sm text-slate-500">PBIs</div>
            {person.pbis.length === 0 ? (
              <p className="text-sm text-slate-500">No PBI in this sprint.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {person.pbis.map((pbi) => (
                  <li key={pbi.id}>
                    <button
                      className="cursor-pointer border-0 bg-transparent p-0 text-left text-blue-600 hover:underline"
                      type="button"
                      onClick={() => {
                        onOpenWorkItem(pbi.id);
                      }}
                    >
                      #{pbi.id} <HighlightMatch query={query} text={pbi.title} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mb-1 text-sm text-slate-500">Items</div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {person.cards.map((card) => (
              <li key={card.item.id}>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
                    type="button"
                    onClick={() => {
                      onOpenWorkItem(card.item.id);
                    }}
                  >
                    <HighlightMatch query={query} text={String(card.item.id)} />
                  </button>
                  <WorkItemTypeTag type={card.item.type} />
                  <WorkItemStateTag state={card.item.state} />
                  <StaleStatusBadge daysInState={staleDaysById.get(card.item.id)} />
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                    type="button"
                    onClick={() => {
                      onOpenWorkItem(card.item.id);
                    }}
                  >
                    <HighlightMatch query={query} text={card.item.title} />
                  </button>
                </div>
                {card.parent ? (
                  <div className="mt-1">
                    <ParentLink
                      parent={card.parent}
                      query={query}
                      onOpenWorkItem={onOpenWorkItem}
                    />
                  </div>
                ) : null}
                <ChildList query={query} onOpenWorkItem={onOpenWorkItem}>
                  {card.children}
                </ChildList>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
