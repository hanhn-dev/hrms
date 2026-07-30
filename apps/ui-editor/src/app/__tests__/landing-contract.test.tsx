import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppRouter } from "../router";

describe("landing route", () => {
  it("shows both import modes and project resume content", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRouter />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /recreate ui editor/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /html snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /screenshot/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft from html/i })).toBeInTheDocument();
    expect(screen.getByText(/resume an existing local project/i)).toBeInTheDocument();
  });
});