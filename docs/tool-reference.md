# Arc MCP Tool Reference

- **Page automation** (12 tools)
  - [`arc_navigate`](#arc_navigate)
  - [`arc_reload`](#arc_reload)
  - [`arc_go_back`](#arc_go_back)
  - [`arc_go_forward`](#arc_go_forward)
  - [`arc_snapshot`](#arc_snapshot)
  - [`arc_get_text`](#arc_get_text)
  - [`arc_evaluate`](#arc_evaluate)
  - [`arc_click`](#arc_click)
  - [`arc_fill`](#arc_fill)
  - [`arc_type`](#arc_type)
  - [`arc_wait_for`](#arc_wait_for)
  - [`arc_screenshot`](#arc_screenshot)
- **Tabs** (4 tools)
  - [`arc_list_tabs`](#arc_list_tabs)
  - [`arc_select_tab`](#arc_select_tab)
  - [`arc_open_tab`](#arc_open_tab)
  - [`arc_close_tab`](#arc_close_tab)
- **Arc-specific** (5 tools)
  - [`arc_list_spaces`](#arc_list_spaces)
  - [`arc_focus_space`](#arc_focus_space)
  - [`arc_list_windows`](#arc_list_windows)
  - [`arc_active_state`](#arc_active_state)
  - [`arc_little_arc`](#arc_little_arc)
- **Engine control** (2 tools)
  - [`arc_cdp_start`](#arc_cdp_start)
  - [`arc_cdp_stop`](#arc_cdp_stop)
- **Meta** (2 tools)
  - [`arc_status`](#arc_status)
  - [`arc_check_capabilities`](#arc_check_capabilities)

## Page automation

These tools act on the active tab of the active engine (live or CDP).

### `arc_navigate`

**Description:** Navigate the active Arc tab to a URL and return an accessibility snapshot with element refs.

**Parameters:**

- **url** (string) **(required)**: The URL to open.

---

### `arc_reload`

**Description:** Reload the active Arc tab and return a fresh snapshot.

**Parameters:** None.

---

### `arc_go_back`

**Description:** Navigate back in the active Arc tab history and return a snapshot.

**Parameters:** None.

---

### `arc_go_forward`

**Description:** Navigate forward in the active Arc tab history and return a snapshot.

**Parameters:** None.

---

### `arc_snapshot`

**Description:** Capture an accessibility snapshot of the active Arc tab: interactive elements as `[ref] role "name"`. Refs are valid only until the next snapshot or navigation.

**Parameters:** None.

---

### `arc_get_text`

**Description:** Return the visible text of the active Arc tab (truncated to 20000 characters).

**Parameters:** None.

---

### `arc_evaluate`

**Description:** Evaluate a JavaScript expression in the active Arc tab and return the JSON-serialized result. In the live engine this must be a single-line expression.

**Parameters:**

- **js** (string) **(required)**: A JavaScript expression to evaluate in the page.

---

### `arc_click`

**Description:** Click an element by its ref from the latest `arc_snapshot`.

**Parameters:**

- **ref** (string) **(required)**: Element ref from `arc_snapshot`, e.g. `3`.

---

### `arc_fill`

**Description:** Set the value of an input or textarea by its ref (replaces existing value).

**Parameters:**

- **ref** (string) **(required)**: Element ref from `arc_snapshot`.
- **value** (string) **(required)**: The value to set.

---

### `arc_type`

**Description:** Type text into an element by its ref, optionally submitting (pressing Enter) afterward.

**Parameters:**

- **ref** (string) **(required)**: Element ref from `arc_snapshot`.
- **text** (string) **(required)**: The text to type.
- **submit** (boolean) _(optional)_: Submit the form / press Enter after typing.

---

### `arc_wait_for`

**Description:** Wait until the given text appears in the active Arc tab, or time out.

**Parameters:**

- **text** (string) **(required)**: Text to wait for.
- **timeoutMs** (number) _(optional)_: Timeout in milliseconds. Default `10000`.

---

### `arc_screenshot`

**Description:** Capture a screenshot. The live engine captures the Arc window (requires Screen Recording and Accessibility permissions); the CDP engine captures the page.

**Parameters:**

- **fullPage** (boolean) _(optional)_: Capture the full page instead of the viewport (CDP engine).

---

## Tabs

### `arc_list_tabs`

**Description:** List tabs with index, title, URL, and which is active (marked `*`). Live: front-window tabs. CDP: all CDP pages.

**Parameters:** None.

---

### `arc_select_tab`

**Description:** Select (focus) a tab by its index from `arc_list_tabs`.

**Parameters:**

- **index** (number) **(required)**: Tab index from `arc_list_tabs`.

---

### `arc_open_tab`

**Description:** Open a new tab, optionally at a URL.

**Parameters:**

- **url** (string) _(optional)_: URL to open in the new tab.

---

### `arc_close_tab`

**Description:** Close a tab by its index from `arc_list_tabs`.

**Parameters:**

- **index** (number) **(required)**: Tab index from `arc_list_tabs`.

---

## Arc-specific

> NOTE: These tools use AppleScript against the running Arc instance and require exactly one Arc running.

### `arc_list_spaces`

**Description:** List Arc Spaces in the front window with index, title, id, and which is active (marked `*`).

**Parameters:** None.

---

### `arc_focus_space`

**Description:** Focus (switch to) an Arc Space by its title or id from `arc_list_spaces`.

**Parameters:**

- **space** (string) **(required)**: Space title or id.

---

### `arc_list_windows`

**Description:** List Arc windows with index, name, and id.

**Parameters:** None.

---

### `arc_active_state`

**Description:** Report the active Arc window name, active Space, and active tab title and URL.

**Parameters:** None.

---

### `arc_little_arc`

**Description:** Open a URL in a Little Arc window. Write-only: it creates the window but cannot read it back.

**Parameters:**

- **url** (string) **(required)**: URL to open in Little Arc.

---

## Engine control

### `arc_cdp_start`

**Description:** Switch to the CDP engine on a dedicated Arc profile (native screenshots, auto-wait). Arc is single-instance, so your normal Arc must be closed; pass `confirmQuitDaily` to let arc-mcp quit it (relaunched on `arc_cdp_stop`).

**Parameters:**

- **confirmQuitDaily** (boolean) _(optional)_: Allow quitting your running Arc so the dedicated instance can take over.

---

### `arc_cdp_stop`

**Description:** Leave CDP mode: shut down the dedicated Arc instance and relaunch your normal Arc. Page and tab tools return to the live engine.

**Parameters:** None.

---

## Meta

### `arc_status`

**Description:** Report Arc MCP status: active engine, default engine, running Arc instances, live-engine reachability, and CDP profile state.

**Parameters:** None.

---

### `arc_check_capabilities`

**Description:** Probe what the live engine can do on the running Arc: basic AppleScript control and in-page JavaScript execution.

**Parameters:** None.
