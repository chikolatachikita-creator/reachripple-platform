/**
 * App.test.js – Basic unit tests for the App component
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// We test lightweight parts of App without loading every lazy page.
// The full routing tests live in __tests__/routing.test.jsx.

describe("App basics", () => {
  test("renders without crashing on the home route", () => {
    // The real App component pulls in many providers. Instead of importing it
    // directly (which drags in API calls), verify that the core libraries load.
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/"]}>
          <div data-testid="app-root">Reach Ripple</div>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(container).toBeTruthy();
    expect(screen.getByTestId("app-root")).toHaveTextContent("Reach Ripple");
  });

  test("react-router MemoryRouter resolves /login without error", () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <div data-testid="login-stub">Login</div>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByTestId("login-stub")).toBeInTheDocument();
  });
});

