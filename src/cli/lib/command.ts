import type { Args } from "./args.js";

export interface Command {
  name: string;
  summary: string;
  usage: string;
  run(args: Args): Promise<number>;
}
