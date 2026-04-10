/**
 * App.smoke.test.jsx – Smoke tests to verify key modules import correctly
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

describe("Smoke tests", () => {
  test("HelmetProvider + MemoryRouter render without errors", () => {
    const { unmount } = render(
      <HelmetProvider>
        <MemoryRouter>
          <div>smoke</div>
        </MemoryRouter>
      </HelmetProvider>
    );
    unmount(); // clean up
  });

  test("testing-library renders and queries work", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <h1 data-testid="heading">Reach Ripple Platform</h1>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByTestId("heading")).toHaveTextContent("Reach Ripple Platform");
  });

  test("key frontend dependencies are importable", () => {
    // Verify core modules can be required without runtime errors
    expect(typeof React.createElement).toBe("function");
    expect(typeof render).toBe("function");
    expect(typeof MemoryRouter).toBe("function");
  });
});
