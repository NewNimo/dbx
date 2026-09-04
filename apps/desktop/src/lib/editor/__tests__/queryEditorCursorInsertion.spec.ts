// @vitest-environment happy-dom

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { insertEditorTextAtCursor, insertTextIntoActiveQueryEditor } from "@/lib/editor/queryEditorTextEdits";

describe("queryEditorCursorInsertion", () => {
  it("inserts text at the cursor position when selection is empty", () => {
    let state = EditorState.create({
      doc: "SELECT * FROM ",
      selection: { anchor: 14 },
    });
    const view = {
      get state() {
        return state;
      },
      dispatch(spec: any) {
        if (spec.changes) {
          state = state.update(spec).state;
        }
      },
    };

    const inserted = insertEditorTextAtCursor(view, "users");
    expect(inserted).toBe(true);
    expect(state.doc.toString()).toBe("SELECT * FROM users");
    expect(state.selection.main.anchor).toBe(19);
    expect(state.selection.main.empty).toBe(true);
  });

  it("replaces the selected range when selection is non-empty", () => {
    let state = EditorState.create({
      doc: "SELECT * FROM old_table WHERE id = 1",
      selection: { anchor: 14, head: 23 },
    });
    const view = {
      get state() {
        return state;
      },
      dispatch(spec: any) {
        if (spec.changes) {
          state = state.update(spec).state;
        }
      },
    };

    const inserted = insertEditorTextAtCursor(view, "new_table");
    expect(inserted).toBe(true);
    expect(state.doc.toString()).toBe("SELECT * FROM new_table WHERE id = 1");
    expect(state.selection.main.anchor).toBe(23);
  });

  it("returns false and does not modify document when editor is readOnly", () => {
    let state = EditorState.create({
      doc: "SELECT 1",
      selection: { anchor: 8 },
      extensions: [EditorState.readOnly.of(true)],
    });
    const view = {
      get state() {
        return state;
      },
      dispatch(spec: any) {
        if (spec.changes) {
          state = state.update(spec).state;
        }
      },
    };

    const inserted = insertEditorTextAtCursor(view, " FROM users");
    expect(inserted).toBe(false);
    expect(state.doc.toString()).toBe("SELECT 1");
  });

  it("inserts text into active query editor via EditorView.findFromDOM", () => {
    const container = document.createElement("div");
    container.setAttribute("data-query-editor-root", "");
    document.body.appendChild(container);

    const view = new EditorView({
      state: EditorState.create({
        doc: "SELECT * FROM ",
        selection: { anchor: 14 },
      }),
      parent: container,
    });

    try {
      const inserted = insertTextIntoActiveQueryEditor("products");
      expect(inserted).toBe(true);
      expect(view.state.doc.toString()).toBe("SELECT * FROM products");
      expect(view.state.selection.main.anchor).toBe(22);
    } finally {
      view.destroy();
      container.remove();
    }
  });

  it("returns false if active query editor DOM is not found", () => {
    const inserted = insertTextIntoActiveQueryEditor("orders");
    expect(inserted).toBe(false);
  });
});
