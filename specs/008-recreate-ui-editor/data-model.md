# Data Model: Recreate UI Editor

**Phase**: 1 - Design  
**Feature**: [spec.md](./spec.md)  
**Date**: 2026-05-22

---

## Entities

### SourceCapture

The user-provided source material that seeds UI recreation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable capture identifier. |
| `kind` | `'html_snapshot' | 'screenshot_image'` | How the source entered the system. |
| `sourceLabel` | `string` | User-visible label for the source. |
| `originalUrl` | `string | null` | Optional original page URL when known. |
| `contentRef` | `string` | IndexedDB or object-URL reference to the stored source payload. |
| `dimensions` | `{ width: number; height: number } | null` | Pixel size when known. |
| `createdAt` | `string` | ISO timestamp. |

```typescript
export interface SourceCapture {
  readonly id: string;
  readonly kind: 'html_snapshot' | 'screenshot_image';
  readonly sourceLabel: string;
  readonly originalUrl: string | null;
  readonly contentRef: string;
  readonly dimensions: { readonly width: number; readonly height: number } | null;
  readonly createdAt: string;
}
```

---

### ImportSession

The analysis lifecycle for one source capture.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable import-session identifier. |
| `sourceCaptureId` | `string` | The analyzed source capture. |
| `status` | `'queued' | 'analyzing' | 'draft_ready' | 'needs_review' | 'failed'` | Current import state. |
| `confidenceScore` | `number | null` | Best-effort reconstruction confidence from `0` to `1`. |
| `unresolvedRegionIds` | `string[]` | Regions that require manual review. |
| `errorMessage` | `string | null` | Normalized failure reason when import fails. |
| `completedAt` | `string | null` | Completion timestamp when analysis ends. |

```typescript
export interface ImportSession {
  readonly id: string;
  readonly sourceCaptureId: string;
  readonly status: 'queued' | 'analyzing' | 'draft_ready' | 'needs_review' | 'failed';
  readonly confidenceScore: number | null;
  readonly unresolvedRegionIds: readonly string[];
  readonly errorMessage: string | null;
  readonly completedAt: string | null;
}
```

---

### DesignProject

The root container for redesign work derived from one imported source.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable project identifier. |
| `name` | `string` | User-defined project name. |
| `sourceCaptureId` | `string` | Originating source capture. |
| `currentRevisionId` | `string` | The latest editable revision. |
| `shareMode` | `'local_only' | 'bundle_exported'` | How the project can be shared in v1. |
| `createdAt` | `string` | ISO timestamp. |
| `updatedAt` | `string` | ISO timestamp. |

```typescript
export interface DesignProject {
  readonly id: string;
  readonly name: string;
  readonly sourceCaptureId: string;
  readonly currentRevisionId: string;
  readonly shareMode: 'local_only' | 'bundle_exported';
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

---

### EditableComponentNode

A single editable node inside the recreated UI tree.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable node identifier. |
| `componentType` | `string` | Semantic component kind such as `frame`, `text`, `image`, `button`, or `input`. |
| `role` | `'layout' | 'content' | 'control' | 'navigation' | 'media'` | Editing and rendering category. |
| `bounds` | `CanvasBounds` | Position and size on the canvas. |
| `styleTokens` | `Record<string, string>` | Token-backed visual settings for spacing, color, radius, typography, and borders. |
| `content` | `EditableContent` | Component text, image reference, icon reference, or other editable payload. |
| `locked` | `boolean` | Whether the node is currently locked against edits. |
| `children` | `string[]` | Ordered child-node identifiers. |

```typescript
export interface EditableComponentNode {
  readonly id: string;
  readonly componentType: string;
  readonly role: 'layout' | 'content' | 'control' | 'navigation' | 'media';
  readonly bounds: CanvasBounds;
  readonly styleTokens: Readonly<Record<string, string>>;
  readonly content: EditableContent;
  readonly locked: boolean;
  readonly children: readonly string[];
}

export interface CanvasBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export type EditableContent =
  | { readonly kind: 'none' }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'image'; readonly assetRef: string; readonly alt: string | null }
  | { readonly kind: 'icon'; readonly name: string }
  | { readonly kind: 'input'; readonly placeholder: string | null; readonly value: string | null };
```

---

### DraftScreen

The current editable canvas assembled from component nodes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable screen identifier. |
| `projectId` | `string` | Owning design project. |
| `rootNodeId` | `string` | Root of the component tree. |
| `canvasSize` | `{ width: number; height: number }` | Screen size used for editing and preview. |
| `selectedNodeIds` | `string[]` | Current editor selection set. |
| `manualReviewRegions` | `ManualReviewRegion[]` | Areas flagged during import for user correction. |

```typescript
export interface DraftScreen {
  readonly id: string;
  readonly projectId: string;
  readonly rootNodeId: string;
  readonly canvasSize: { readonly width: number; readonly height: number };
  readonly selectedNodeIds: readonly string[];
  readonly manualReviewRegions: readonly ManualReviewRegion[];
}

export interface ManualReviewRegion {
  readonly id: string;
  readonly bounds: CanvasBounds;
  readonly reason: 'low_confidence' | 'missing_asset' | 'ambiguous_structure';
  readonly note: string;
}
```

---

### PrototypeRevision

A saved point-in-time version of the draft screen.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable revision identifier. |
| `projectId` | `string` | Owning project. |
| `baseRevisionId` | `string | null` | Prior revision from which this one was derived. |
| `versionNumber` | `number` | Monotonic revision number within the project. |
| `status` | `'draft' | 'published'` | Whether the revision is still being edited or shared for review. |
| `screenId` | `string` | Draft screen snapshot associated with the revision. |
| `createdAt` | `string` | ISO timestamp. |

```typescript
export interface PrototypeRevision {
  readonly id: string;
  readonly projectId: string;
  readonly baseRevisionId: string | null;
  readonly versionNumber: number;
  readonly status: 'draft' | 'published';
  readonly screenId: string;
  readonly createdAt: string;
}
```

---

### PrototypeBundle

The exported share artifact used to move a prototype between users or environments.

| Field | Type | Description |
|-------|------|-------------|
| `bundleVersion` | `number` | Bundle-schema version. |
| `project` | `DesignProject` | Exported project metadata. |
| `sourceCapture` | `SourceCapture` | The source reference bundled with the prototype. |
| `revision` | `PrototypeRevision` | The published revision being shared. |
| `screen` | `DraftScreen` | The snapshot to render in preview mode. |
| `nodes` | `EditableComponentNode[]` | All component nodes required to reconstruct the screen. |
| `exportedAt` | `string` | ISO timestamp. |

```typescript
export interface PrototypeBundle {
  readonly bundleVersion: number;
  readonly project: DesignProject;
  readonly sourceCapture: SourceCapture;
  readonly revision: PrototypeRevision;
  readonly screen: DraftScreen;
  readonly nodes: readonly EditableComponentNode[];
  readonly exportedAt: string;
}
```

---

## Relationships

- One `SourceCapture` may produce one or more `ImportSession` records as the import pipeline is retried.
- One successful `ImportSession` creates one `DesignProject` and one initial `PrototypeRevision`.
- One `DesignProject` contains many `PrototypeRevision` records over time.
- One `PrototypeRevision` references one `DraftScreen` snapshot.
- One `DraftScreen` references many `EditableComponentNode` records through its rooted tree.
- One `PrototypeBundle` packages one published revision plus the source and nodes needed for preview.

---

## Validation Rules

| Rule | Description |
|------|-------------|
| `SourceCapture.kind` must be one of the supported v1 import modes | Prevents unsupported arbitrary URL crawls from entering the workflow. |
| HTML snapshot imports must contain non-empty markup | Empty or whitespace-only HTML is rejected before analysis begins. |
| Screenshot imports must provide an allowed image MIME type and known dimensions | Prevents unsupported binary payloads from entering the importer. |
| `ImportSession.confidenceScore` must be between `0` and `1` when present | Keeps review thresholds consistent. |
| `EditableComponentNode.bounds.width` and `height` must be positive numbers | Prevents invisible or invalid canvas nodes. |
| `styleTokens` must reference token-backed keys only | Avoids hardcoded design values leaking into persisted state. |
| Every `DraftScreen.rootNodeId` must resolve to a node present in the revision snapshot | Keeps the canvas tree renderable. |
| `PrototypeRevision.versionNumber` must increase by exactly `1` within a project | Preserves predictable revision history. |
| Only `published` revisions can be exported as `PrototypeBundle` artifacts | Prevents accidental sharing of incomplete drafts. |
| All persisted entities and exported bundles must pass Zod validation before save or load | Ensures storage integrity and safe restoration. |

---

## State Transitions

### ImportSession

`queued` -> `analyzing` -> `draft_ready`  
`queued` -> `analyzing` -> `needs_review`  
`queued` -> `analyzing` -> `failed`

### PrototypeRevision

`draft` -> `published`

Published revisions are immutable share points. New edits branch into a new `draft` revision derived from the published or current revision.
