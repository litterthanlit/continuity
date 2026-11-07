import { Caption, Title, cx } from "continuity";

/**
 * "Illustration · sample data" — the honesty line on scenes where the UI could pass for a
 * recording (capture, save, resume). The label size (28) at 400 in the grey: a caption, not a
 * label. By default it places itself bottom-left on the safe edge (render it as a direct child
 * of <Safe>), so capture's, save's and resume's sit on the same pixel and the match can pair it.
 */
export const SAMPLE_CAPTION = "Illustration · sample data";

export function SampleCaption({ ct, children = SAMPLE_CAPTION, place = true, class: cls }: { ct?: string; children?: string; place?: boolean; class?: string }) {
  return (
    <Caption ct={ct} size="label" class={cx("whitespace-nowrap", place && "absolute bottom-0 left-0", cls)}>
      {children}
    </Caption>
  );
}

/**
 * The wordmark: lowercase "hypher" set as type — Geist 500 at the title step (48 / 56), no logo
 * file. On the smoke pass `class="text-canvas"` (one ink on the field).
 */
export function Wordmark({ ct, children = "hypher", class: cls }: { ct?: string; children?: string; class?: string }) {
  return (
    <Title ct={ct} as="p" balance={false} class={cx("whitespace-nowrap", cls)}>
      {children}
    </Title>
  );
}
