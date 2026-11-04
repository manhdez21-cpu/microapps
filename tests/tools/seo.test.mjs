import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adsTxt, headTags, injectHead, isUrl, normUrl, publicPaths, robotsTxt, siteConfigJs, sitemapXml } from "../../tools/lib/seo.mjs";
describe("seo", () => {
  it("normaliza y valida la URL del sitio", () => {
    assert.equal(normUrl(" https://a.github.io/microapps/ "), "https://a.github.io/microapps");
    assert.equal(isUrl("https://a.github.io/microapps"), true);
    assert.equal(isUrl("a.com"), false);
  });
  it("rutas públicas excluyen el panel y quitan index.html", () => {
    assert.deepEqual(publicPaths(["index.html", "apps/caja-clara/index.html", "apps/control-center/index.html", "guias/x.html", "apps/a/sw.js"]), ["/", "/apps/caja-clara/", "/guias/x.html"]);
  });
  it("sitemap y robots", () => {
    const x = sitemapXml("https://e.com", ["/", "/a/"], "2026-11-04");
    assert.match(x, /<loc>https:\/\/e\.com\/a\/<\/loc>/);
    assert.match(robotsTxt("https://e.com"), /Sitemap: https:\/\/e\.com\/sitemap\.xml/);
    assert.equal(/Sitemap/.test(robotsTxt("")), false);
  });
  it("ads.txt solo con un ID de editor válido", () => {
    assert.equal(adsTxt("ca-pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
    assert.equal(adsTxt(""), null);
    assert.equal(adsTxt("ca-pub-x"), null);
  });
  it("inyecta canonical y Open Graph sin duplicar", () => {
    const h = '<head><title>T</title><meta name="description" content="D"></head>';
    const out = injectHead(h, headTags(h, "https://e.com/a/"));
    assert.match(out, /rel="canonical" href="https:\/\/e\.com\/a\/"/);
    assert.match(out, /og:title" content="T"/);
    assert.equal(injectHead(out, headTags(out, "https://e.com/a/")), out);
  });
  it("site-config toma solo variables públicas", () => {
    const js = siteConfigJs({ SITE_URL: "https://e.com/", GA4_ID: "G-ABCDEF1234", SECRET: "x" });
    assert.match(js, /"siteUrl":"https:\/\/e\.com"/);
    assert.match(js, /"ga4Id":"G-ABCDEF1234"/);
    assert.equal(/SECRET|"x"/.test(js), false);
  });
});
