# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-04

### Added

- DevTools tools (CDP only): `arc_list_console_messages`, `arc_get_console_message`, `arc_list_network_requests`, `arc_get_network_request`, `arc_performance_start_trace`, `arc_performance_stop_trace`, `arc_emulate`, `arc_resize_page`.
- Advanced input tools (CDP only): `arc_hover`, `arc_drag`, `arc_press_key`, `arc_fill_form`, `arc_upload_file`, `arc_handle_dialog`.
- Memory tool (CDP only): `arc_take_heap_snapshot`, written to a temporary `.heapsnapshot` file with a summary.
- Per-page console and network capture with rolling buffers (500 entries per page) armed when the CDP engine connects; a stable `pageId` is surfaced in `arc_list_tabs` and accepted by the DevTools tools.
- Unit test harness (`bun test`) covering AppleScript escaping, page-result parsing, ref validation, config loading, `ps` parsing, result formatting, the serial queue, the retry helper, and the ring buffer; plus an opt-in live end-to-end smoke (`ARC_MCP_E2E=1`).
- GitHub Actions CI running typecheck and unit tests.
- Configuration: `ARC_MCP_LOG_LEVEL`, `ARC_MCP_CDP_TIMEOUT_MS`, `ARC_MCP_ALLOW_ATTACH_CAPTURE`.

### Changed

- Log output is gated by `ARC_MCP_LOG_LEVEL` and remains stderr only.
- AppleScript page evaluation retries with bounded exponential backoff instead of a fixed loop.
- The dedicated CDP Arc instance's stdout/stderr is captured and surfaced in the error when CDP startup fails.
- Captured JavaScript dialogs auto-dismiss after 30 seconds if not handled, so a page is never left blocked.

### Security

- In `attach` mode, console/network capture and `arc_emulate` are disabled unless `ARC_MCP_ALLOW_ATTACH_CAPTURE=1`, so the real Arc session is never instrumented unintentionally.

## [0.1.0] - 2026-06-03

### Added

- Initial dual-engine Arc MCP server: a live AppleScript engine and a CDP (Playwright) engine behind one tool surface, with page, tab, Space, and window tools, accessibility snapshots, screenshots, and engine switching.

[Unreleased]: https://github.com/Mukbeast4/arc-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Mukbeast4/arc-mcp/compare/cb14513...v0.2.0
[0.1.0]: https://github.com/Mukbeast4/arc-mcp/commit/cb14513
