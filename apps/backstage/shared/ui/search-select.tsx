"use client";

import { useState } from "react";
import { Select, type SelectProps } from "antd";
import { HighlightMatch, SearchQueryProvider } from "./highlight-match";

function optionLabel(option: { label?: React.ReactNode; value?: unknown }): string {
  if (typeof option.label === "string" || typeof option.label === "number") {
    return String(option.label);
  }
  if (typeof option.value === "string" || typeof option.value === "number") {
    return String(option.value);
  }
  return "";
}

export function SearchSelect(props: SelectProps): React.JSX.Element {
  const {
    showSearch,
    searchValue,
    onSearch,
    filterOption,
    optionFilterProp,
    autoClearSearchValue,
    optionRender,
    ...rest
  } = props;
  const [localSearch, setLocalSearch] = useState("");
  const showSearchConfig = typeof showSearch === "object" ? showSearch : undefined;
  const controlledSearch = searchValue ?? showSearchConfig?.searchValue;
  const query = controlledSearch ?? localSearch;

  function handleSearch(value: string): void {
    setLocalSearch(value);
    onSearch?.(value);
    showSearchConfig?.onSearch?.(value);
  }

  return (
    <Select
      {...rest}
      optionRender={(option, info) => (
        <SearchQueryProvider query={query}>
          {optionRender ? (
            optionRender(option, info)
          ) : (
            <HighlightMatch query={query} text={optionLabel(option)} />
          )}
        </SearchQueryProvider>
      )}
      showSearch={{
        ...showSearchConfig,
        onSearch: handleSearch,
        searchValue: query,
        ...(filterOption !== undefined ? { filterOption } : {}),
        ...(optionFilterProp !== undefined ? { optionFilterProp } : {}),
        ...(autoClearSearchValue !== undefined ? { autoClearSearchValue } : {}),
      }}
    />
  );
}
