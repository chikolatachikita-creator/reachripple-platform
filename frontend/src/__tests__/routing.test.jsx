/**
 * Routing Tests - VivaStreet-Style URL Pattern
 * =============================================
 * Tests mirroring the actual route structure in App.jsx:
 *   /escort/:location   — main search results
 *   /escorts             — escorts home page
 *   /escorts/:location   — legacy redirect → /escort/:location
 *   /search              — legacy redirect → /escort/gb
 *
 * Categories:
 * 1. Basic routing tests
 * 2. Legacy route redirect tests
 * 3. Parameter consistency tests
 * 4. Shareable URL tests
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Mock search results page — matches /escort/:location
const MockSearchResultsPage = () => {
  const { location: loc } = useParams();
  const [searchParams] = useSearchParams();
  const routeLocation = useLocation();

  return (
    <div data-testid="search-results">
      <span data-testid="location-param">{loc}</span>
      <span data-testid="d-param">{searchParams.get("d") || ""}</span>
      <span data-testid="loc-type">{searchParams.get("locType") || ""}</span>
      <span data-testid="outcode">{searchParams.get("outcode") || ""}</span>
      <span data-testid="district">{searchParams.get("district") || ""}</span>
      <span data-testid="full-path">{routeLocation.pathname + routeLocation.search}</span>
    </div>
  );
};

const MockHomePage = () => <div data-testid="home-page">Home</div>;
const MockEscortsHomePage = () => <div data-testid="escorts-home">Escorts Home</div>;

// Replicate redirect components from App.jsx
function LegacyCategoryRedirect({ categorySlug }) {
  const { location: legacyLocation } = useParams();
  const loc = useLocation();
  const query = loc.search || "";
  const targetCategory = categorySlug === "escorts" ? "escort" : categorySlug;
  return <Navigate to={`/${targetCategory}/${legacyLocation || "gb"}${query}`} replace />;
}

function LegacySearchRedirect() {
  const loc = useLocation();
  const query = loc.search || "";
  return <Navigate to={`/escort/gb${query}`} replace />;
}

// Test Router wrapper — mirrors App.jsx route structure
const TestRouter = ({ initialRoute }) => (
  <HelmetProvider>
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<MockHomePage />} />

        {/* Main unified route */}
        <Route path="/escort/:location" element={<MockSearchResultsPage />} />

        {/* Escorts home page */}
        <Route path="/escorts" element={<MockEscortsHomePage />} />

        {/* Legacy /search route */}
        <Route path="/search" element={<LegacySearchRedirect />} />

        {/* Legacy redirects */}
        <Route path="/escorts/:location" element={<LegacyCategoryRedirect categorySlug="escorts" />} />
        <Route path="/adult-entertainment/:location" element={<LegacyCategoryRedirect categorySlug="adult-entertainment" />} />
        <Route path="/personals/:location" element={<LegacyCategoryRedirect categorySlug="personals" />} />
      </Routes>
    </MemoryRouter>
  </HelmetProvider>
);

// ---------------------------------------------------------------------------
// 1. Basic Routes
// ---------------------------------------------------------------------------
describe("Routing Tests - Basic Routes", () => {
  test("renders home page at /", () => {
    render(<TestRouter initialRoute="/" />);
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  test("renders escorts home at /escorts", () => {
    render(<TestRouter initialRoute="/escorts" />);
    expect(screen.getByTestId("escorts-home")).toBeInTheDocument();
  });

  test("renders search results at /escort/gb", () => {
    render(<TestRouter initialRoute="/escort/gb" />);
    expect(screen.getByTestId("search-results")).toBeInTheDocument();
    expect(screen.getByTestId("location-param")).toHaveTextContent("gb");
  });

  test("renders search results at /escort/n1-islington", () => {
    render(<TestRouter initialRoute="/escort/n1-islington" />);
    expect(screen.getByTestId("search-results")).toBeInTheDocument();
    expect(screen.getByTestId("location-param")).toHaveTextContent("n1-islington");
  });

  test("renders with distance param /escort/n1-islington?d=10", () => {
    render(<TestRouter initialRoute="/escort/n1-islington?d=10" />);
    expect(screen.getByTestId("search-results")).toBeInTheDocument();
    expect(screen.getByTestId("d-param")).toHaveTextContent("10");
  });

  test("renders with full location params", () => {
    render(<TestRouter initialRoute="/escort/n1-islington?d=10&locType=outcode&outcode=N1&district=Islington" />);
    expect(screen.getByTestId("search-results")).toBeInTheDocument();
    expect(screen.getByTestId("d-param")).toHaveTextContent("10");
    expect(screen.getByTestId("loc-type")).toHaveTextContent("outcode");
    expect(screen.getByTestId("outcode")).toHaveTextContent("N1");
    expect(screen.getByTestId("district")).toHaveTextContent("Islington");
  });
});

// ---------------------------------------------------------------------------
// 2. Legacy Route Redirects
// ---------------------------------------------------------------------------
describe("Routing Tests - Legacy Redirects", () => {
  test("/search redirects to /escort/gb", async () => {
    render(<TestRouter initialRoute="/search" />);
    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("location-param")).toHaveTextContent("gb");
  });

  test("/search?q=massage preserves query in redirect", async () => {
    render(<TestRouter initialRoute="/search?q=massage&verified=1" />);
    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });
    const fullPath = screen.getByTestId("full-path").textContent;
    expect(fullPath).toContain("/escort/gb");
    expect(fullPath).toContain("q=massage");
    expect(fullPath).toContain("verified=1");
  });

  test("/escorts/manchester redirects to /escort/manchester", async () => {
    render(<TestRouter initialRoute="/escorts/manchester" />);
    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("location-param")).toHaveTextContent("manchester");
    expect(screen.getByTestId("full-path").textContent).toContain("/escort/manchester");
  });

  test("/escorts/n1?d=10&verified=1 preserves query params", async () => {
    render(<TestRouter initialRoute="/escorts/n1?d=10&verified=1" />);
    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });
    const fullPath = screen.getByTestId("full-path").textContent;
    expect(fullPath).toContain("/escort/n1");
    expect(fullPath).toContain("d=10");
    expect(fullPath).toContain("verified=1");
  });
});

// ---------------------------------------------------------------------------
// 3. Parameter Consistency
// ---------------------------------------------------------------------------
describe("Routing Tests - Parameter Consistency", () => {
  test("uses 'd' param, not 'distance'", () => {
    render(<TestRouter initialRoute="/escort/n1-islington?d=15" />);
    expect(screen.getByTestId("d-param")).toHaveTextContent("15");
  });

  test("d=0 is valid (nationwide)", () => {
    render(<TestRouter initialRoute="/escort/gb?d=0" />);
    expect(screen.getByTestId("d-param")).toHaveTextContent("0");
  });

  test("locType=outcode with outcode and district params", () => {
    render(<TestRouter initialRoute="/escort/n1-islington?locType=outcode&outcode=N1&district=Islington" />);
    expect(screen.getByTestId("loc-type")).toHaveTextContent("outcode");
    expect(screen.getByTestId("outcode")).toHaveTextContent("N1");
    expect(screen.getByTestId("district")).toHaveTextContent("Islington");
  });
});

// ---------------------------------------------------------------------------
// 4. Shareable URLs
// ---------------------------------------------------------------------------
describe("Routing Tests - Shareable URLs", () => {
  test("full URL with all params is shareable", () => {
    const url = "/escort/n1-islington?d=10&locType=outcode&outcode=N1&district=Islington&verified=1&available=1";
    render(<TestRouter initialRoute={url} />);
    expect(screen.getByTestId("search-results")).toBeInTheDocument();
    expect(screen.getByTestId("full-path").textContent).toBe(url);
  });

  test("URL structure is predictable and consistent", () => {
    render(<TestRouter initialRoute="/escort/sw1a-westminster?d=5&locType=outcode&outcode=SW1A&district=Westminster" />);
    expect(screen.getByTestId("location-param")).toHaveTextContent("sw1a-westminster");
    expect(screen.getByTestId("d-param")).toHaveTextContent("5");
    expect(screen.getByTestId("outcode")).toHaveTextContent("SW1A");
    expect(screen.getByTestId("district")).toHaveTextContent("Westminster");
  });
});
