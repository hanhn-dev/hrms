import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FloatMenuPanel, type FloatMenuHandle } from "./FloatMenuPanel";
import {
  ROOT_ID,
  defaultSendMessage,
  shouldMountFloatMenu,
  type FloatMenuActionId,
  type SendMessage,
} from "./float-menu-logic";

export {
  FLOAT_MENU_ITEMS,
  FAB_SIZE,
  DRAG_THRESHOLD_PX,
  MENU_GAP_PX,
  MENU_ESTIMATED_WIDTH,
  MENU_ESTIMATED_HEIGHT,
  buildRequestForAction,
  clampFabPosition,
  defaultFabPosition,
  isDragGesture,
  isFloatMenuActionId,
  normalizeFabPosition,
  resolveFabPosition,
  resolveMenuPlacement,
  shouldMountFloatMenu,
} from "./float-menu-logic";
export type {
  FabPosition,
  FloatMenuActionId,
  FloatMenuIconName,
  FloatMenuItem,
  MenuPlacement,
} from "./float-menu-logic";


export type FloatMenuController = {
  open: boolean;
  busy: boolean;
  setOpen: (open: boolean) => void;
  runAction: (actionId: FloatMenuActionId) => Promise<void>;
  destroy: () => void;
  /** Resolves once the React panel has registered its imperative handle. */
  whenReady: () => Promise<void>;
};

export interface MountFloatMenuOptions {
  sendMessage?: SendMessage;
  document?: Document;
  /** Override top-frame gate (tests). Defaults to `shouldMountFloatMenu()`. */
  canMount?: boolean;
}

let activeRoot: Root | null = null;

/**
 * Mounts the floating action button + feature menu on the page (React).
 * No-ops when not in the top frame or when already mounted.
 */
export function mountFloatMenu(
  options: MountFloatMenuOptions = {},
): FloatMenuController | null {
  const doc = options.document ?? document;
  const send = options.sendMessage ?? defaultSendMessage;
  const canMount = options.canMount ?? shouldMountFloatMenu();

  if (!canMount) {
    return null;
  }

  if (doc.getElementById(ROOT_ID)) {
    return null;
  }

  const host = doc.createElement("div");
  host.id = ROOT_ID;
  doc.documentElement.appendChild(host);

  const root = createRoot(host);
  activeRoot = root;

  let handle: FloatMenuHandle | null = null;
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  root.render(
    createElement(FloatMenuPanel, {
      sendMessage: send,
      onReady: (next) => {
        handle = next;
        resolveReady();
      },
    }),
  );

  const controller: FloatMenuController = {
    get open() {
      return handle?.open ?? false;
    },
    get busy() {
      return handle?.busy ?? false;
    },
    setOpen(open: boolean) {
      handle?.setOpen(open);
    },
    async runAction(actionId) {
      await ready;
      await handle!.runAction(actionId);
    },
    whenReady: () => ready,
    destroy() {
      root.unmount();
      activeRoot = null;
      host.remove();
      handle = null;
    },
  };

  return controller;
}

export function unmountFloatMenu(doc: Document = document): void {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
  doc.getElementById(ROOT_ID)?.remove();
}
