#!/usr/bin/env node

const CHECKS = [
  "Auth: login, logout, current profile, permission-gated navigation.",
  "Pages: create, edit, preview, publish, archive/delete, restore revision.",
  "Blog: create, edit, categories, tags, related posts, publish, restore revision.",
  "Media: folders, valid upload, invalid upload rejection, alt text, trash, hard delete.",
  "Menus: locations, nested nodes, status/order changes.",
  "Settings: general, SEO, appearance, captcha, privacy, social, integrations.",
  "Public API: resolver, pages, posts, categories, tags, menus, settings, sitemap, robots.",
  "Public writes: contact, member registration, analytics events, rate-limit response.",
  "A11y: keyboard navigation, focus states, modal/drawer Escape, labels, contrast.",
  "Ops: audit log entries, backup export, import plan, error monitoring configuration.",
];

console.log("CMS MVP QA checklist");

for (const [index, check] of CHECKS.entries()) {
  console.log(`${index + 1}. ${check}`);
}

console.log("Checklist generated. Mark each item in the release issue before shipping.");
