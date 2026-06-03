# Arc browser for agents

[![Model Context Protocol](https://img.shields.io/badge/MCP-server-1f6feb)](https://modelcontextprotocol.io)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-black?logo=apple&logoColor=white)](https://www.apple.com/macos)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

`arc-mcp` lets your coding agent drive the [Arc browser](https://arc.net) on macOS as an MCP server: test web apps inside your real logged-in session, automate Arc's own UI (Spaces, tabs, windows), and run general browsing tasks. It exposes two engines behind one tool surface — a **live** engine (your running Arc, via AppleScript) and a **cdp** engine (a dedicated, debuggable Arc instance, via the Chrome DevTools Protocol).

## [Tool reference](./docs/tool-reference.md) | [Getting started](#getting-started) | [Configuration](#configuration) | [Concepts](#concepts) | [Limitations](#known-limitations)

## Key features

- **Drive your real Arc session**: the live engine controls your actual running Arc — real profile, real logins — alongside your own browsing.
- **High-fidelity testing**: the CDP engine runs a clean, dedicated Arc instance with native screenshots and Playwright auto-waiting.
- **Accessibility-first interaction**: `arc_snapshot` returns a compact tree of interactive elements with stable refs; click, type, and fill by ref instead of brittle selectors.
- **Arc-native automation**: list and focus Spaces, manage tabs and windows, open Little Arc — things a generic Chrome MCP can't do.
- **Chrome DevTools surface (CDP)**: capture console messages and network requests, run performance traces, emulate devices and throttling, drive advanced input (hover, drag, keys, file upload, dialogs), and take heap snapshots.

## Disclaimers

`arc-mcp` exposes the content of your browser to the MCP client, which can inspect, read, and modify any page the agent navigates to. In live mode it acts inside your real, logged-in Arc. Avoid pointing it at sensitive accounts you don't want the agent to touch.

macOS only. Arc is in maintenance mode (The Browser Company / Atlassian); the automation surfaces used here are stable but frozen.

No telemetry: `arc-mcp` collects nothing and makes no network calls of its own.

## Requirements

- macOS with [Arc](https://arc.net) installed at `/Applications/Arc.app`
- [Node.js](https://nodejs.org) 20 or newer (the server runs under Node)
- [Bun](https://bun.sh) to install and build

## Getting started

Build the server:

```bash
bun install
bun run build
```

Add this configuration to your MCP client:

```json
{
  "mcpServers": {
    "arc-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/arc-mcp/dist/index.js"],
      "env": { "ARC_MCP_DEFAULT_ENGINE": "live" }
    }
  }
}
```

> [!NOTE]
> The server runs under **Node**, not Bun: Playwright's CDP transport hangs under Bun. Bun is only used to install and build.

### MCP client configuration

<details>
  <summary>Claude Code</summary>

Use the Claude Code CLI to add the server at user scope:

```bash
claude mcp add arc-mcp --scope user -- node /absolute/path/to/arc-mcp/dist/index.js
```

</details>

<details>
  <summary>Cursor / generic MCP client</summary>

Use the JSON configuration above in your client's MCP settings, pointing `args` at the built `dist/index.js`. See [`.mcp.json.example`](./.mcp.json.example).

</details>

### Your first prompt

```
Open https://example.com in Arc, take a snapshot, and list the links on the page.
```

The live engine drives your running Arc. For an isolated, high-fidelity instance, switch with `arc_cdp_start`.

## Tools

See the full [tool reference](./docs/tool-reference.md).

- **Page automation** (12 tools)
  - [`arc_navigate`](docs/tool-reference.md#arc_navigate)
  - [`arc_reload`](docs/tool-reference.md#arc_reload)
  - [`arc_go_back`](docs/tool-reference.md#arc_go_back)
  - [`arc_go_forward`](docs/tool-reference.md#arc_go_forward)
  - [`arc_snapshot`](docs/tool-reference.md#arc_snapshot)
  - [`arc_get_text`](docs/tool-reference.md#arc_get_text)
  - [`arc_evaluate`](docs/tool-reference.md#arc_evaluate)
  - [`arc_click`](docs/tool-reference.md#arc_click)
  - [`arc_fill`](docs/tool-reference.md#arc_fill)
  - [`arc_type`](docs/tool-reference.md#arc_type)
  - [`arc_wait_for`](docs/tool-reference.md#arc_wait_for)
  - [`arc_screenshot`](docs/tool-reference.md#arc_screenshot)
- **Tabs** (4 tools)
  - [`arc_list_tabs`](docs/tool-reference.md#arc_list_tabs)
  - [`arc_select_tab`](docs/tool-reference.md#arc_select_tab)
  - [`arc_open_tab`](docs/tool-reference.md#arc_open_tab)
  - [`arc_close_tab`](docs/tool-reference.md#arc_close_tab)
- **Arc-specific** (5 tools)
  - [`arc_list_spaces`](docs/tool-reference.md#arc_list_spaces)
  - [`arc_focus_space`](docs/tool-reference.md#arc_focus_space)
  - [`arc_list_windows`](docs/tool-reference.md#arc_list_windows)
  - [`arc_active_state`](docs/tool-reference.md#arc_active_state)
  - [`arc_little_arc`](docs/tool-reference.md#arc_little_arc)
- **Engine control** (2 tools)
  - [`arc_cdp_start`](docs/tool-reference.md#arc_cdp_start)
  - [`arc_cdp_stop`](docs/tool-reference.md#arc_cdp_stop)
- **Meta** (2 tools)
  - [`arc_status`](docs/tool-reference.md#arc_status)
  - [`arc_check_capabilities`](docs/tool-reference.md#arc_check_capabilities)

The following groups require the CDP engine (run [`arc_cdp_start`](docs/tool-reference.md#arc_cdp_start) first); in live mode they return a clear error.

- **DevTools** (8 tools)
  - [`arc_list_console_messages`](docs/tool-reference.md#arc_list_console_messages)
  - [`arc_get_console_message`](docs/tool-reference.md#arc_get_console_message)
  - [`arc_list_network_requests`](docs/tool-reference.md#arc_list_network_requests)
  - [`arc_get_network_request`](docs/tool-reference.md#arc_get_network_request)
  - [`arc_performance_start_trace`](docs/tool-reference.md#arc_performance_start_trace)
  - [`arc_performance_stop_trace`](docs/tool-reference.md#arc_performance_stop_trace)
  - [`arc_emulate`](docs/tool-reference.md#arc_emulate)
  - [`arc_resize_page`](docs/tool-reference.md#arc_resize_page)
- **Advanced input** (6 tools)
  - [`arc_hover`](docs/tool-reference.md#arc_hover)
  - [`arc_drag`](docs/tool-reference.md#arc_drag)
  - [`arc_press_key`](docs/tool-reference.md#arc_press_key)
  - [`arc_fill_form`](docs/tool-reference.md#arc_fill_form)
  - [`arc_upload_file`](docs/tool-reference.md#arc_upload_file)
  - [`arc_handle_dialog`](docs/tool-reference.md#arc_handle_dialog)
- **Memory** (1 tool)
  - [`arc_take_heap_snapshot`](docs/tool-reference.md#arc_take_heap_snapshot)

## Configuration

Set these via the `env` block in your MCP configuration.

- **`ARC_MCP_DEFAULT_ENGINE`**
  Which engine is active when the server starts.
  - **Type:** string (`live` | `cdp`)
  - **Default:** `live`

- **`ARC_MCP_BIN`**
  Path to the Arc binary.
  - **Type:** string
  - **Default:** `/Applications/Arc.app/Contents/MacOS/Arc`

- **`ARC_MCP_PROFILE_DIR`**
  User-data directory for the dedicated CDP instance (onboarded once, reused).
  - **Type:** string
  - **Default:** `~/Library/Application Support/arc-mcp/profile`

- **`ARC_MCP_CDP_PORT`**
  Remote-debugging port for the CDP engine. `0` selects a default of `9222`.
  - **Type:** number
  - **Default:** `9222`

- **`ARC_MCP_CDP_MODE`**
  `dedicated` launches and manages its own instance; `attach` connects to an Arc you started yourself with a debug port.
  - **Type:** string (`dedicated` | `attach`)
  - **Default:** `dedicated`

- **`ARC_MCP_CDP_TIMEOUT_MS`**
  Timeout for launching and connecting to the CDP instance.
  - **Type:** number (milliseconds)
  - **Default:** `30000`

- **`ARC_MCP_ALLOW_ATTACH_CAPTURE`**
  In `attach` mode, set to `1` to allow console/network capture on your real Arc session. Off by default so attaching never instruments your live browsing.
  - **Type:** string (`1` to enable)
  - **Default:** unset (disabled)

- **`ARC_MCP_LOG_LEVEL`**
  Server log verbosity. Logs are written to stderr only.
  - **Type:** string (`debug` | `info` | `warn` | `error`)
  - **Default:** `info`

## Concepts

### Two engines, and why

Arc is Chromium-based, but modern Chromium (136+) refuses remote debugging on your default profile for security, and a debug port can only be opened at launch. An agent therefore **cannot** attach the Chrome DevTools Protocol to your everyday, logged-in Arc. `arc-mcp` resolves this with two engines:

- **live** — drives your actual running Arc through AppleScript / Apple Events. Real profile, real logins, page interaction via injected JavaScript. This engine touches your real session.
- **cdp** — drives a dedicated, debuggable Arc instance via `playwright-core`. Native screenshots and auto-waiting. Because Arc is single-instance, this requires your normal Arc to be closed; `arc-mcp` launches and manages its own instance.

### Switching engines

`arc_cdp_start` closes your Arc (pass `confirmQuitDaily: true`) and launches the dedicated CDP instance; `arc_cdp_stop` shuts it down and relaunches your Arc. The page and tab tools follow the active engine, shown by `arc_status`.

### Element refs

`arc_snapshot` returns interactive elements as `[ref] role "name"`. Pass a `ref` to `arc_click`, `arc_fill`, or `arc_type`. Refs are valid only against the snapshot that produced them, in the same tab, before the next navigation — re-snapshot after any change.

### Permissions (macOS)

- **Automation** (control Arc via Apple events) — required for the live engine. System Settings → Privacy & Security → Automation.
- **Screen Recording** and **Accessibility** — only for `arc_screenshot` (live window capture).

The CDP engine requires none of these.

## Known limitations

- Pin/unpin is not available: Arc 1.149's AppleScript `location` setter is broken (reads work, writes fail). Pinning would need a keystroke via Accessibility.
- Live `arc_evaluate` expects a single-line expression; use the CDP engine for multi-line scripts.
- The DevTools, advanced-input, and memory tools require the CDP engine — run `arc_cdp_start` first; in live mode they return a clear error.
- Console and network capture keep a rolling buffer of the most recent 500 entries per page; older entries are evicted. In `attach` mode capture is off unless `ARC_MCP_ALLOW_ATTACH_CAPTURE=1`.
- `arc_performance_stop_trace` returns a compact summary (event count, duration, trace span), not full Core Web Vitals or the raw trace; `arc_resize_page` is best-effort over `connectOverCDP` — use `arc_emulate` for reliable device metrics.
- Tab indices are per-engine (live = front-window tabs; CDP = all CDP pages); re-run `arc_list_tabs` after switching engines. In CDP mode `arc_list_tabs` also shows a stable `[page N]` id that the DevTools tools accept as `pageId`.
- The CDP engine requires your normal Arc to be closed; `arc_cdp_start` handles the quit and restore.

## Development

```bash
bun run build       # compile TypeScript to dist/
bun run typecheck   # type-check only
bun test tests      # unit tests (pure logic, no Arc needed)
bun run check       # typecheck + unit tests
bun run test:e2e    # opt-in live smoke; needs a running Arc (sets ARC_MCP_E2E=1)
node dist/index.js  # run the server over stdio
```

The source is modular: `src/engines/live` (AppleScript engine), `src/engines/cdp` (Playwright engine plus the console/network recorder and CDPSession helpers), `src/tools` (MCP tool registration), `src/lib` (logging, serial queue, retry). Logs go to stderr only — stdout is the MCP transport; set `ARC_MCP_LOG_LEVEL=debug` to trace AppleScript and CDP activity.

Dependencies are pinned. To upgrade one (`@modelcontextprotocol/sdk`, `playwright-core`, `zod`): bump it alone, run `bun run check`, then smoke the server manually — `arc_status`, a live `arc_navigate`/`arc_snapshot`, then `arc_cdp_start` + a CDP tool + `arc_cdp_stop`. `playwright-core` is the most sensitive (its `connectOverCDP` is what hangs under Bun), so verify the CDP path under Node before committing.

## License

[MIT](./LICENSE)
