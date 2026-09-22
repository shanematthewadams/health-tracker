  assert.match(adminShell, /Editorial/i);\n  assert.match(adminShell, /\["quotes", "Quotes"\]/i);\n  assert.match(adminShell, /\["emails", "Emails"\]/i);\n  assert.match(adminShell, /\\["quotes", "Quotes"\\]/i);\n  assert.match(adminShell, /\\["emails", "Emails"\\]/i);
  assert.match(admin, /const PLACEMENTS/i);
  assert.match(admin, /const CSV_FIELDS = \["quote", "attribution", "quote_kind", "themes", "placements"/i);
  assert.match(admin, /Bulk CSV/i);
  assert.match(admin, /Sample CSV/i);
  assert.match(admin, /parseCsv/i);
  assert.match(admin, /Download rejected rows/i);
  assert.match(admin, /Feature next reflection/i);
  assert.match(admin, /Source \/ rights note/i);
});

test("quote themes remain descriptive rather than diagnostic", () => {
  assert.match(reflection, /supportCount > 0[\s\S]*return "connection"/i);
  assert.match(reflection, /loggedDayCount === 7[\s\S]*return "consistency"/i);
  assert.match(reflection, /loggedDayCount <= 3[\s\S]*return "beginnings"/i);
  assert.doesNotMatch(reflection, /diagnos|medical advice|because your weight|caused by/i);
});

test("the reflection keeps its non-judgmental footer before the emotional closing thought", () => {
  const footerIndex = reflection.indexOf("A week is a snapshot, not a grade.");
  const quoteIndex = reflection.indexOf("A thought to carry with you");
  assert.ok(footerIndex >= 0);
  assert.ok(quoteIndex > footerIndex);
});


test("editorial library admin supports in-place editing, search, filters, and explicit bulk status selection", () => {
  assert.match(admin, /Search quote or attribution/i);
  assert.match(admin, /statusFilter/i);
  assert.match(admin, /themeFilter/i);
  assert.match(admin, /authorFilter/i);
  assert.match(admin, /draft\?\.id === quote\.id/i);
  assert.match(admin, /Select all filtered/i);
  assert.match(admin, /Pause selected/i);
  assert.match(admin, /Resume selected/i);
  assert.match(admin, /\.in\("id", ids\)/i);
  assert.match(admin, /No editorial items match those filters/i);
});

test("initial opening is one shared editorial ritual with a minimum dwell and cached quote", () => {
  assert.match(brand, /OPENING_MIN_DWELL_MS = 1250/i);
  assert.match(brand, /Preparing your With/i);
  assert.match(brand, /showEditorialOpening &&/i);
  assert.match(brand, /deferFallbackUntilLoaded/i);
  assert.match(tracker, /await finishInitialOpening\(\)/i);
  assert.match(onboarding, /await finishInitialOpening\(\)/i);
  assert.match(editorialLine, /editorialLineCache/i);
});
