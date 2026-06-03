import { test, expect, describe } from "bun:test";
import {
  clickJs,
  fillJs,
  typeJs,
  evalExprJs,
  waitTextJs,
  SNAPSHOT_JS,
  GET_TEXT_JS,
} from "../src/engines/live/liveJs.ts";

describe("clickJs", () => {
  test("targets the ref selector and clicks", () => {
    const js = clickJs("3");
    expect(js).toContain('[data-arcmcp-ref="3"]');
    expect(js).toContain(".click()");
  });
});

describe("fillJs", () => {
  test("targets the ref and json-encodes the value", () => {
    const js = fillJs("2", "hello");
    expect(js).toContain('[data-arcmcp-ref="2"]');
    expect(js).toContain(JSON.stringify("hello"));
  });
  test("json-encoding neutralizes injection payloads", () => {
    const payload = '"; alert(1); var x="</script>\n';
    expect(fillJs("0", payload)).toContain(JSON.stringify(payload));
  });
});

describe("typeJs", () => {
  test("submit true includes the submit branch", () => {
    expect(typeJs("1", "x", true)).toContain("requestSubmit");
  });
  test("submit false omits the submit branch", () => {
    expect(typeJs("1", "x", false)).not.toContain("requestSubmit");
  });
  test("json-encodes the text", () => {
    expect(typeJs("1", 'a"b', false)).toContain(JSON.stringify('a"b'));
  });
});

describe("evalExprJs", () => {
  test("wraps the expression in an IIFE", () => {
    expect(evalExprJs("1+1")).toBe("(function(){return (1+1);})()");
  });
});

describe("waitTextJs", () => {
  test("json-encodes the needle", () => {
    expect(waitTextJs("foo")).toContain(JSON.stringify("foo"));
  });
});

describe("static page scripts", () => {
  test("SNAPSHOT_JS assigns refs and queries the DOM", () => {
    expect(SNAPSHOT_JS).toContain("data-arcmcp-ref");
    expect(SNAPSHOT_JS).toContain("querySelectorAll");
  });
  test("GET_TEXT_JS truncates output", () => {
    expect(GET_TEXT_JS).toContain("slice(0,20000)");
  });
});
