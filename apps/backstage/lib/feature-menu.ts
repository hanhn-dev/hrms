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
  "Admin Configuration": [
    "Add Organization",
    "Create Organization Structure",
    "View Organization Chart",
    "Sync Customer Credentials",
    "Access Right Management",
    "Confirmation Management",
    "Performance Management",
    "Workflow Group Setup",
    "Add Workflow",
    "Define Workflow",
    "Workflow Dashboard",
    "Attendance Management",
    "Add Questionnaire",
    "Set Interview Template",
    "Assign Question Template",
    "Email Template Builder",
    "Setup Masters",
    "Home Page Setup",
    "Policy Documents Setup",
    "Recruitment Management",
    "Setup & Config Change Tracker",
    "Separation Management",
    "Manage Scheduler",
    "Setup Employee Self Service",
    "Windows Login Setup",
    "Create New User",
    "Disable User",
    "Permission Setup",
    "Options Setup",
    "Policy Setup",
    "Advance Setup",
    "Reference Master Setup",
    "RA Permission Setup",
    "Conference Room Booking Options Setup",
    "Conference Room Booking Permission Setup",
    "Pre-Onboarding Configure Setup",
    "Training Options Setup",
    "Training Permission Setup",
    "Master Question Bank",
    "Customer Config",
    "Payroll Details",
    "Payroll Integration",
    "Setup Compensation",
    "Auto Compa-Ratio Configuration",
    "Setup Violations & Occurrence",
    "Charts Setup",
    "My Details Field Config",
    "Employee Information Configuration",
    "Doc Builder",
    "Menu Manager",
    "Visitor Management Configuration",
    "Messaging & Notifications",
    "GeoTracking",
    "Celebration Hub Settings",
    "HRMSLicense",
    "Email Notification Monitor",
    "Leave Management",
  ],
  "Customer License": [
    "Customer License Dashboard",
    "Dashboard Insights Configuration",
  ],
  "Employee Management": [
    "Employee Dashboard",
    "Bulk Profile Update",
    "Pre-Onboarding Candidate",
    "Employee Creation",
    "Search Employee",
    "Employee Bulk Update",
    "Bulk Document Import",
    "Background Verification",
    "Remote Location",
    "Compensation",
    "Removed Welcome Emails",
    "Offer Rolled Out",
    "Celebration Hub",
  ],
  "Leave & Attendance": [
    "Notifications",
    "L&A Dashboard",
    "L&A Tasks",
    "Approval History",
  ],
  "Performance Assessment": [
    "PMS Dashboard",
    "Notifications",
    "My Competency/KRA/Goal",
    "Employee Assessments",
    "Goal Setting",
    "Assessment Status",
    "Create Assessment Cycle",
    "Create Goal Period",
    "Assessment Report",
    "Normalization",
    "Appraisal Due",
    "9-Box Grid",
    "Salary Recommendations",
    "360° Feedback",
  ],
  "Confirmation Assessment": [
    "Notifications",
    "Employee Assessments",
    "Confirmation Status",
    "Initiate Confirmation",
    "Confirmation Due",
  ],
  Separation: [
    "Notifications",
    "Separation Dashboard",
    "Separation Tasks",
  ],
  "Policy Documents": ["Self Attestation"],
  "Reports & Analytics": [
    "Report Builder",
    "Static Reports",
    "Manage Reports",
    "Report Designer",
    "Traditional Reports",
    "Report Center",
  ],
  Recruitment: [
    "Notifications",
    "Recruitment Dashboard",
    "RRS Dashboard",
    "Sourcing Dashboard",
    "Shortlisting Dashboard",
    "Interview Dashboard",
    "Candidate Dashboard",
    "Candidate Referral",
    "Resume Bank",
    "Candidate Login Link",
    "Donor Information Setup",
  ],
  Travel: ["Travel Requests"],
  "Expense & Reimbursement": [
    "Expense Requests",
    "Expense Dashboard",
    "Petty Cash Management",
    "Report",
  ],
  Advances: ["Report", "Advance Requests"],
  "Resource Allocation": [
    "Manage Allocation",
    "Manage Access",
    "Shared Allocation",
    "Reports",
    "Lock Policy",
  ],
  LMS: [
    "Dashboard",
    "Trainings",
    "Manage TNI",
    "Manage Goal Setting",
    "Reports",
    "Calendar",
  ],
  "Conference Room Booking": [
    "My Bookings",
    "Master Data",
    "Notifications",
  ],
  TimePort: [
    "Setup Master",
    "TimeSheet",
    "Report",
    "TimeSheet Approval",
    "TimeSheet Status",
    "TimeSheet Export",
  ],
  "Task Management": [
    "Tasks",
    "Dashboard",
    "Projects Summary",
    "Resource Summary",
    "Configuration",
    "My Work",
    "Reports",
    "Stage Audit",
    "Stage Approvals",
    "Project Templates",
    "My Planner",
    "Notifications",
  ],
  PayRoll: ["Setup Masters", "Income Tax Declaration", "Report"],
  Survey: ["Survey List", "Analytics", "My Participation"],
  AccessPoint: ["Visitor"],
  ESS: ["My Payslip"],
  "Reward & Recognition": [
    "Recognition Dashboard",
    "Give Recognition",
    "My Recognitions",
    "Social Feed",
    "Leaderboard",
    "Marketplace",
    "My Rewards",
    "Notifications",
    "Admin Console",
  ],
  "Client Onboarding": [
    "Upload Files",
    "Import Management",
    "Config Manager",
    "Setup Data Management",
    "Plan Templates",
    "Client Plan Config",
    "Audit Trail",
    "Cross Client Dashboard",
    "Default Access Right Management",
    "Data Catalog",
  ],
  "Violations & Occurrence": ["Violations & Occurrence"],
  "Visitor Management": [
    "Visitor Pass",
    "Check-In / Check-Out",
    "Visitor Dashboard",
    "Visitors Analytics & Reports",
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
