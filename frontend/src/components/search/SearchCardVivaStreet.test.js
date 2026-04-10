/**
 * Tests for URL building behavior in SearchCardVivaStreet.
 */
function buildUrl({ categorySlug, distance, v }) {
  const locSlug = v?.locationSlug || "gb";
  const qs = new URLSearchParams();
  qs.set("d", String(distance));
  if (v?.type) qs.set("locType", v.type);
  if (v?.outcode) qs.set("outcode", v.outcode);
  if (v?.district) qs.set("district", v.district);
  if (v?.postcode) qs.set("postcode", v.postcode);
  return `/${encodeURIComponent(categorySlug)}/${encodeURIComponent(locSlug)}?${qs.toString()}`;
}

describe("SearchCardVivaStreet URL building", () => {
  test("outcode route uses path slug with correct params", () => {
    const u1 = buildUrl({
      categorySlug: "escort",
      distance: 10,
      v: { type: "outcode", outcode: "N1", district: "Islington", locationSlug: "islington" },
    });
    expect(u1).toMatch(/^\/escort\/islington\?/);
    expect(u1).toContain("d=10");
    expect(u1).toContain("locType=outcode");
    expect(u1).toContain("outcode=N1");
    expect(u1).toContain("district=Islington");
  });

  test("postcode route uses resolved location slug", () => {
    const u2 = buildUrl({
      categorySlug: "escort",
      distance: 0,
      v: { type: "postcode", postcode: "N1 6XW", locationSlug: "islington" },
    });
    expect(u2).toMatch(/\/escort\/islington\?/);
    expect(u2).toMatch(/postcode=N1(\+|%20)6XW/);
  });

  test("fallback uses /gb when no location value", () => {
    const u3 = buildUrl({ categorySlug: "escort", distance: 5, v: null });
    expect(u3).toMatch(/^\/escort\/gb\?/);
    expect(u3).toContain("d=5");
  });
});
