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
- **DevTools** (8 tools, CDP only)
  - [`arc_list_console_messages`](#arc_list_console_messages)
  - [`arc_get_console_message`](#arc_get_console_message)
  - [`arc_list_network_requests`](#arc_list_network_requests)
  - [`arc_get_network_request`](#arc_get_network_request)
  - [`arc_performance_start_trace`](#arc_performance_start_trace)
  - [`arc_performance_stop_trace`](#arc_performance_stop_trace)
  - [`arc_emulate`](#arc_emulate)
  - [`arc_resize_page`](#arc_resize_page)
- **Advanced input** (6 tools, CDP only)
  - [`arc_hover`](#arc_hover)
  - [`arc_drag`](#arc_drag)
  - [`arc_press_key`](#arc_press_key)
  - [`arc_fill_form`](#arc_fill_form)
  - [`arc_upload_file`](#arc_upload_file)
  - [`arc_handle_dialog`](#arc_handle_dialog)
- **Memory** (1 tool, CDP only)
  - [`arc_take_heap_snapshot`](#arc_take_heap_snapshot)

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

---

## DevTools

> NOTE: These tools require the CDP engine. Run [`arc_cdp_start`](#arc_cdp_start) first; in live mode they return an error. Console/network capture and `arc_emulate` install state on the page and are disabled in `attach` mode unless `ARC_MCP_ALLOW_ATTACH_CAPTURE=1`, so they never instrument your real session unintentionally. Capture keeps the most recent 500 console and network entries per page (older entries are evicted). Tools accept an optional **pageId** (from `arc_list_tabs`) to target a specific page; page ids are assigned only when capture is enabled.

### `arc_list_console_messages`

**Description:** List console messages captured from the active CDP page. Higher ids are newer; results are paginated with a `showing X-Y of N (page P)` footer.

**Parameters:**

- **level** (string: `log` | `info` | `warn` | `error` | `debug`) _(optional)_: Filter by console level.
- **limit** (number) _(optional)_: Max entries to return. Default `50`.
- **offset** (number) _(optional)_: Pagination offset. Default `0`.
- **pageId** (number) _(optional)_: Target page id from `arc_list_tabs`; defaults to the active page.

---

### `arc_get_console_message`

**Description:** Return the full text and source of a captured console message by id.

**Parameters:**

- **id** (number) **(required)**: Message id from `arc_list_console_messages`.
- **pageId** (number) _(optional)_: Target page id; defaults to the active page.

---

### `arc_list_network_requests`

**Description:** List network requests captured from the active CDP page, with method, status, resource type, URL, and duration.

**Parameters:**

- **resourceType** (string) _(optional)_: Filter by type, e.g. `document`, `script`, `xhr`, `fetch`, `image`.
- **status** (number) _(optional)_: Filter by HTTP status code.
- **limit** (number) _(optional)_: Max entries to return. Default `50`.
- **offset** (number) _(optional)_: Pagination offset. Default `0`.
- **pageId** (number) _(optional)_: Target page id; defaults to the active page.

---

### `arc_get_network_request`

**Description:** Return details of a captured network request by id, optionally including the response body. Bodies are fetched lazily and truncated to 64 KB; binary bodies are reported by size only; a stale request (page navigated/closed) returns a clear message.

**Parameters:**

- **id** (number) **(required)**: Request id from `arc_list_network_requests`.
- **includeBody** (boolean) _(optional)_: Fetch and include the response body.
- **pageId** (number) _(optional)_: Target page id; defaults to the active page.

---

### `arc_performance_start_trace`

**Description:** Start a Chrome performance trace on the active CDP page. Finish with `arc_performance_stop_trace`.

**Parameters:**

- **reload** (boolean) _(optional)_: Reload the page after starting, to capture the full load.
- **categories** (string) _(optional)_: Comma-separated trace categories.

---

### `arc_performance_stop_trace`

**Description:** Stop the running performance trace and return a compact summary: event count, wall-clock duration, and trace span (not full Core Web Vitals or the raw trace).

**Parameters:** None.

---

### `arc_emulate`

**Description:** Apply device/network emulation to the active CDP page: viewport, userAgent, CPU and network throttling, and geolocation. Each provided option is applied; the result echoes what was set.

**Parameters:**

- **width** (number) _(optional)_: Viewport width (set with `height` via device metrics).
- **height** (number) _(optional)_: Viewport height (set with `width`).
- **userAgent** (string) _(optional)_: Override the user agent.
- **cpuThrottling** (number) _(optional)_: CPU slowdown multiplier, e.g. `4`.
- **networkThrottling** (string: `offline` | `slow-3g` | `fast-3g` | `none`) _(optional)_: Network conditions.
- **latitude** (number) _(optional)_: Geolocation latitude (set with `longitude`).
- **longitude** (number) _(optional)_: Geolocation longitude (set with `latitude`).

---

### `arc_resize_page`

**Description:** Resize the active CDP page viewport. Best-effort over `connectOverCDP`; use `arc_emulate` for reliable device metrics.

**Parameters:**

- **width** (number) **(required)**: Viewport width.
- **height** (number) **(required)**: Viewport height.

---

## Advanced input

> NOTE: These tools require the CDP engine. Run [`arc_cdp_start`](#arc_cdp_start) first; in live mode they return an error. Element refs come from [`arc_snapshot`](#arc_snapshot).

### `arc_hover`

**Description:** Hover the pointer over an element by its ref.

**Parameters:**

- **ref** (string) **(required)**: Element ref from `arc_snapshot`.

---

### `arc_drag`

**Description:** Drag one element onto another by their refs.

**Parameters:**

- **fromRef** (string) **(required)**: Source element ref.
- **toRef** (string) **(required)**: Target element ref.

---

### `arc_press_key`

**Description:** Press a key or chord (e.g. `Enter`, `Escape`, `Control+A`), optionally focusing an element ref first.

**Parameters:**

- **key** (string) **(required)**: Key or chord, e.g. `Enter`, `Tab`, `Control+A`.
- **ref** (string) _(optional)_: Element ref to focus before pressing.

---

### `arc_fill_form`

**Description:** Fill multiple fields in one call, each by its ref.

**Parameters:**

- **fields** (array of `{ ref, value }`) **(required)**: Fields to fill.

---

### `arc_upload_file`

**Description:** Set files on a file input by its ref, from local file paths (the only tool that reads from the local filesystem).

**Parameters:**

- **ref** (string) **(required)**: File input element ref.
- **paths** (array of string) **(required)**: Absolute local file paths to upload.

---

### `arc_handle_dialog`

**Description:** Accept or dismiss a pending JavaScript dialog (alert/confirm/prompt) captured on the page. Captured dialogs auto-dismiss after 30 seconds if not handled, so a page is never left blocked indefinitely.

**Parameters:**

- **action** (string: `accept` | `dismiss`) **(required)**: How to resolve the dialog.
- **promptText** (string) _(optional)_: Text to enter for a prompt dialog when accepting.
- **pageId** (number) _(optional)_: Target page id from `arc_list_tabs`; defaults to the active page.

---

## Memory

> NOTE: This tool requires the CDP engine. Run [`arc_cdp_start`](#arc_cdp_start) first.

### `arc_take_heap_snapshot`

**Description:** Capture a V8 heap snapshot of the active CDP page, write it to a temporary `.heapsnapshot` file, and return the path plus a summary (size and node count). Open the file in Chrome DevTools > Memory for retainer analysis.

**Parameters:** None.
