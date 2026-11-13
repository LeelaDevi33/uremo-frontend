import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { adminToolForPath, adminToolGroups } from "../components/admin/v2/adminNavigation";
import { authReturnPath } from "../lib/authReturnPath";

test("every admin page has a reachable tool, detail parent or compatibility redirect", () => {
  const root = join(process.cwd(), "app", "admin");
  const pageDirectories: string[] = [];
  function walk(dir: string) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.isDirectory()) walk(join(dir, item.name));
      else if (item.name === "page.tsx") pageDirectories.push(relative(root, dir).split(sep).join("/"));
    }
  }
  walk(root);
  const redirects = ["apply-work", "jarvisx-write", "payment-methods", "rejected-orders", "work-applications"];
  const destinations = adminToolGroups.flatMap(group => group.tools.map(item => item.href.split("#")[0]));
  for (const directory of pageDirectories.filter(path => path && !redirects.includes(path))) {
    const route = "/admin/" + directory;
    if (directory.includes("[")) assert.equal(adminToolForPath(route)?.href, route.slice(0, route.lastIndexOf("/")));
    else assert.ok(destinations.includes(route), route + " must be reachable from the admin menu");
  }
  for (const href of destinations) assert.ok(pageDirectories.includes(href.slice("/admin/".length)), href);
});

test("admin sign-in returns to the selected tool including its query and receipt anchor", () => {
  for (const path of ["/admin", "/admin/work-positions?edit=0123456789abcdef01234567", "/admin/opportunities#receipt-heading"]) {
    assert.equal(authReturnPath(path), path);
  }
  for (const path of ["//host.test/admin", "/admin//host.test", "/admin-overview", "/admin/../outside", "/admin\\host.test"]) {
    assert.equal(authReturnPath(path), null);
  }
});
