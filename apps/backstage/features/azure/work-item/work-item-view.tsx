"use client";

import { useRef, useState } from "react";

import type {
  PullRequestCandidate,
  WorkItem,
  WorkItemCommentsResponse,
} from "@hrms/azure-devops";
import {
  getWorkItemComments,
  getWorkItemDetail,
  getWorkItemLinkedPullRequestCount,
  getWorkItemLinkedPullRequests,
} from "@/features/azure/work-item/queries";
import {
  WorkItemDetailModal,
  type WorkItemDetailTab,
} from "@/features/azure/work-item/work-item-detail-modal";

type ParentSummary = { id: number; title: string; type: string };

type HistoryEntry = { id: number; title: string };

type CachedPacket = {
  detail: WorkItem;
  comments: WorkItemCommentsResponse;
  pullRequestCount: number;
  pullRequests?: readonly PullRequestCandidate[];
  parentSummary?: ParentSummary | null;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useWorkItemView(): {
  openView: (workItemId: number) => Promise<void>;
  modal: React.JSX.Element;
} {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<WorkItem | null>(null);
  const [parentSummary, setParentSummary] = useState<ParentSummary | null>(null);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<WorkItemCommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [pullRequestCount, setPullRequestCount] = useState<number | null>(null);
  const [pullRequests, setPullRequests] = useState<readonly PullRequestCandidate[] | null>(null);
  const [pullRequestsLoading, setPullRequestsLoading] = useState(false);
  const [pullRequestsError, setPullRequestsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkItemDetailTab>("comments");
  const [activeId, setActiveId] = useState<number | null>(null);
  const cacheRef = useRef<Map<number, CachedPacket>>(new Map());
  const activeIdRef = useRef<number | null>(null);
  const historyRef = useRef<readonly HistoryEntry[]>([]);
  const detailRef = useRef<WorkItem | null>(null);
  const requestSeq = useRef(0);
  const prRequestSeq = useRef(0);
  const parentRequestSeq = useRef(0);

  function setHistoryEntries(next: readonly HistoryEntry[]): void {
    historyRef.current = next;
    setHistory(next);
  }

  function setDetailState(next: WorkItem | null): void {
    detailRef.current = next;
    setDetail(next);
  }

  const hide = () => {
    setOpen(false);
    setHistoryEntries([]);
  };

  const loadParentSummary = async (
    workItemId: number,
    parentId: number | null,
  ): Promise<void> => {
    if (parentId == null) {
      if (activeIdRef.current === workItemId) {
        setParentSummary(null);
      }
      return;
    }
    const cached = cacheRef.current.get(workItemId);
    if (cached && "parentSummary" in cached) {
      if (activeIdRef.current === workItemId) {
        setParentSummary(cached.parentSummary ?? null);
      }
      return;
    }
    const parentCached = cacheRef.current.get(parentId);
    if (parentCached) {
      const summary: ParentSummary = {
        id: parentCached.detail.id,
        title: parentCached.detail.title,
        type: parentCached.detail.type,
      };
      if (cached) {
        cacheRef.current.set(workItemId, { ...cached, parentSummary: summary });
      }
      if (activeIdRef.current === workItemId) {
        setParentSummary(summary);
      }
      return;
    }
    const seq = parentRequestSeq.current + 1;
    parentRequestSeq.current = seq;
    if (activeIdRef.current === workItemId) {
      setParentSummary(null);
    }
    try {
      const parentDetail = await getWorkItemDetail(parentId);
      const summary: ParentSummary = {
        id: parentDetail.id,
        title: parentDetail.title,
        type: parentDetail.type,
      };
      const existing = cacheRef.current.get(workItemId);
      if (existing) {
        cacheRef.current.set(workItemId, { ...existing, parentSummary: summary });
      }
      if (parentRequestSeq.current === seq && activeIdRef.current === workItemId) {
        setParentSummary(summary);
      }
    } catch {
      const existing = cacheRef.current.get(workItemId);
      if (existing) {
        cacheRef.current.set(workItemId, { ...existing, parentSummary: null });
      }
      if (parentRequestSeq.current === seq && activeIdRef.current === workItemId) {
        setParentSummary(null);
      }
    }
  };

  const loadPullRequests = async (workItemId: number): Promise<void> => {
    const cached = cacheRef.current.get(workItemId);
    if (cached?.pullRequests) {
      setPullRequests(cached.pullRequests);
      setPullRequestCount(cached.pullRequests.length);
      setPullRequestsError(null);
      return;
    }
    const seq = prRequestSeq.current + 1;
    prRequestSeq.current = seq;
    setPullRequests(null);
    setPullRequestsError(null);
    setPullRequestsLoading(true);
    try {
      const results = await getWorkItemLinkedPullRequests(workItemId);
      if (prRequestSeq.current !== seq) {
        return;
      }
      const existing = cacheRef.current.get(workItemId);
      if (existing) {
        cacheRef.current.set(workItemId, {
          ...existing,
          pullRequestCount: results.length,
          pullRequests: results,
        });
      }
      setPullRequests(results);
      setPullRequestCount(results.length);
    } catch (loadError) {
      if (prRequestSeq.current !== seq) {
        return;
      }
      setPullRequestsError(errorMessage(loadError, "Failed to load pull requests."));
    } finally {
      if (prRequestSeq.current === seq) {
        setPullRequestsLoading(false);
      }
    }
  };

  const showWorkItem = async (workItemId: number): Promise<void> => {
    setOpen(true);
    activeIdRef.current = workItemId;
    setActiveId(workItemId);
    setActiveTab("comments");
    setPullRequestsError(null);
    setPullRequestsLoading(false);

    const cached = cacheRef.current.get(workItemId);
    if (cached) {
      setDetailState(cached.detail);
      setComments(cached.comments);
      setPullRequestCount(cached.pullRequestCount);
      setPullRequests(cached.pullRequests ?? null);
      setError(null);
      setCommentsError(null);
      setLoading(false);
      setCommentsLoading(false);
      void loadParentSummary(workItemId, cached.detail.parentId);
      return;
    }

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setDetailState(null);
    setParentSummary(null);
    setComments(null);
    setPullRequests(null);
    setPullRequestCount(null);
    setError(null);
    setCommentsError(null);
    setLoading(true);
    setCommentsLoading(true);

    try {
      const [detailResult, commentsResult, pullRequestCountResult] = await Promise.all([
        getWorkItemDetail(workItemId),
        getWorkItemComments(workItemId).catch((commentsLoadError: unknown) => {
          if (requestSeq.current === seq) {
            setCommentsError(errorMessage(commentsLoadError, "Failed to load comments."));
          }
          return null;
        }),
        getWorkItemLinkedPullRequestCount(workItemId).catch(() => null),
      ]);
      if (requestSeq.current !== seq) {
        return;
      }
      const resolvedCount = pullRequestCountResult ?? 0;
      setPullRequestCount(pullRequestCountResult);
      if (commentsResult) {
        cacheRef.current.set(workItemId, {
          detail: detailResult,
          comments: commentsResult,
          pullRequestCount: resolvedCount,
        });
        setComments(commentsResult);
      } else {
        setComments(null);
      }
      setDetailState(detailResult);
      void loadParentSummary(workItemId, detailResult.parentId);
    } catch (loadError) {
      if (requestSeq.current !== seq) {
        return;
      }
      setError(errorMessage(loadError, "Failed to load work item."));
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false);
        setCommentsLoading(false);
      }
    }
  };

  /** Open from the board / external click — starts a fresh navigation stack. */
  const openView = async (workItemId: number): Promise<void> => {
    setHistoryEntries([]);
    await showWorkItem(workItemId);
  };

  /** Drill into a related item (parent) while keeping a back stack. */
  const navigateTo = async (workItemId: number): Promise<void> => {
    const current = detailRef.current;
    if (current != null && current.id !== workItemId) {
      setHistoryEntries([
        ...historyRef.current,
        { id: current.id, title: current.title },
      ]);
    }
    await showWorkItem(workItemId);
  };

  const goBack = (): void => {
    const stack = historyRef.current;
    if (stack.length === 0) {
      return;
    }
    const previous = stack[stack.length - 1]!;
    setHistoryEntries(stack.slice(0, -1));
    void showWorkItem(previous.id);
  };

  const onTabChange = (tab: WorkItemDetailTab): void => {
    setActiveTab(tab);
    if (tab === "pull-requests" && activeId != null) {
      void loadPullRequests(activeId);
    }
  };

  const backTarget = history.length > 0 ? history[history.length - 1]! : null;

  const modal = (
    <WorkItemDetailModal
      activeTab={activeTab}
      backTarget={open ? backTarget : null}
      comments={open ? comments : null}
      commentsError={open ? commentsError : null}
      commentsLoading={open && commentsLoading}
      detail={open ? detail : null}
      error={open ? error : null}
      loading={open && loading}
      open={open}
      parentSummary={open ? parentSummary : null}
      pullRequestCount={open ? pullRequestCount : null}
      pullRequests={open ? pullRequests : null}
      pullRequestsError={open ? pullRequestsError : null}
      pullRequestsLoading={open && pullRequestsLoading}
      onBack={goBack}
      onClose={hide}
      onOpenWorkItem={(id) => {
        void navigateTo(id);
      }}
      onTabChange={onTabChange}
    />
  );

  return { openView, modal };
}
