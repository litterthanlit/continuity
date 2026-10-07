const tty = process.stdout.isTTY;
const c = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

export const color = {
  dim: c("2"),
  bold: c("1"),
  red: c("31"),
  green: c("32"),
  yellow: c("33"),
  cyan: c("36"),
};

export const log = (...s: unknown[]) => console.log(...s);
export const step = (s: string) => console.log(color.cyan("◆ ") + s);
export const ok = (s: string) => console.log(color.green("✔ ") + s);
export const warn = (s: string) => console.log(color.yellow("▲ ") + s);
export const fail = (s: string) => console.log(color.red("✖ ") + s);

export function secs(ms: number) {
  return (ms / 1000).toFixed(1) + "s";
}
