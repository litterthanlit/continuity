import { Safe, Label, Window, Terminal } from "continuity";

/**
 * The reel's bookend: the label on the left edge and one terminal under it. The open and
 * the end share it exactly, so the closing depth move lands on the frame the reel began on.
 */
export function TerminalFrame({ label, lines }: { label: string; lines: string[] }) {
  return (
    <Safe>
      <Label ct="label" class="absolute left-0 top-[64px]">
        {label}
      </Label>
      <Window ct="term" title="zsh" width={864} height={288} class="absolute left-0 top-[304px]">
        <Terminal ct="sh" class="p-[48px]" size={32} lines={lines} />
      </Window>
    </Safe>
  );
}
