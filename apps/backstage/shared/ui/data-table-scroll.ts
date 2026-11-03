import type { TableProps } from "antd";

type TableScroll = NonNullable<TableProps<unknown>["scroll"]>;

/** Keep a wide table inside its card. A caller `scroll.x` replaces the default. */
export function tableScroll(scroll: TableProps<unknown>["scroll"]): TableScroll {
  return { x: "max-content", ...scroll };
}
