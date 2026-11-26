/** Props DataTable needs so a server-paged EditableTable search hits SQL. */
export type EditableServerSearchProps = {
  searchQuery?: string;
  onSearch?: (query: string) => void;
};

export function toDataTableSearchProps(
  props: EditableServerSearchProps,
): {
  searchQuery: string;
  onSearch?: (query: string) => void;
} {
  return {
    searchQuery: props.searchQuery ?? "",
    onSearch: props.onSearch,
  };
}
