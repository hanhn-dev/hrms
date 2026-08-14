/**
 * HRMS sidebar taxonomy for grouping feature guides.
 *
 * Top-level order follows the live left-nav (Home through Travel), then the
 * remaining employerid=0 `TDynamicMenuHierarchy` modules that sit below the
 * fold or behind a license. `Platform` is a docs-only bucket for surfaces
 * that are not in the sidebar (login, session, JWT).
 *
 * Child order under Leave & Attendance matches the expanded screenshot
 * (Notifications, L&A Dashboard, L&A Tasks, Approval History). Other
 * submenus follow the same XML template.
 */
export const PLATFORM_MENU = "Platform";

export const MENU_ORDER: readonly string[] = [
  PLATFORM_MENU,
  "Home",
  "Admin Configuration",
  "Customer License",
  "Employee Management",
  "My Details",
  "Leave & Attendance",
  "Performance Assessment",
  "Confirmation Assessment",
  "Policy Documents",
  "Employee Self Service",
  "Separation",
  "Reports & Analytics",
  "Recruitment",
  "Travel",
  "Expense & Reimbursement",
  "Advances",
  "Resource Allocation",
  "LMS",
  "Conference Room Booking",
  "TimePort",
  "Task Management",
  "PayRoll",
  "Survey",
  "AccessPoint",
  "ESS",
  "Reward & Recognition",
  "Asset Management",
  "Client Onboarding",
  "Violations & Occurrence",
  "Visitor Management",
];

const SUBMENU_ORDER: Record<string, readonly string[]> = {
  "Admin Configuration": ["Workflow Management"],
  "Leave & Attendance": [
    "Notifications",
    "L&A Dashboard",
    "L&A Tasks",
    "Approval History",
  ],
  Separation: [
    "Notifications",
    "Separation Dashboard",
    "Separation Tasks",
  ],
};

export interface FeatureNavItem {
  slug: string;
  title: string;
  menu: string;
  submenu?: string;
}

export interface FeatureSubgroup {
  submenu?: string;
  items: FeatureNavItem[];
}

export interface FeatureMenuGroup {
  menu: string;
  subgroups: FeatureSubgroup[];
}

/** Disk folder for a top-level menu label: "Leave & Attendance" → "leave-and-attendance". */
export function menuToFolderSlug(menu: string): string {
  return menu
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orderIndex(list: readonly string[], value: string): number {
  const index = list.indexOf(value);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function compareKnownThenAlpha(
  list: readonly string[],
  a: string,
  b: string,
): number {
  const delta = orderIndex(list, a) - orderIndex(list, b);
  return delta !== 0 ? delta : a.localeCompare(b);
}

export function groupFeaturesByMenu(docs: FeatureNavItem[]): FeatureMenuGroup[] {
  const byMenu = new Map<string, FeatureNavItem[]>();
  for (const doc of docs) {
    const menu = doc.menu || PLATFORM_MENU;
    const list = byMenu.get(menu) ?? [];
    list.push(doc);
    byMenu.set(menu, list);
  }

  const menus = [...byMenu.keys()].sort((a, b) =>
    compareKnownThenAlpha(MENU_ORDER, a, b),
  );

  return menus.map((menu) => {
    const bySub = new Map<string | undefined, FeatureNavItem[]>();
    for (const item of byMenu.get(menu) ?? []) {
      const list = bySub.get(item.submenu) ?? [];
      list.push(item);
      bySub.set(item.submenu, list);
    }

    const submenuKeys = [...bySub.keys()].sort((a, b) => {
      if (!a) return -1;
      if (!b) return 1;
      return compareKnownThenAlpha(SUBMENU_ORDER[menu] ?? [], a, b);
    });

    return {
      menu,
      subgroups: submenuKeys.map((submenu) => ({
        submenu,
        items: (bySub.get(submenu) ?? []).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      })),
    };
  });
}
