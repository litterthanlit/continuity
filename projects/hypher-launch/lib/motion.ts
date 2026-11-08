/**
 * The ambient push's ease: an in-out sine, a steady drift with soft ends. The `inOut` token
 * (0.65, 0, 0.35, 1) is built for deliberate moves — a portal, a focus — and on a 2–3 s ambient
 * push it is all but still for its first and last third, so the hold reads as frozen (ct motion
 * counted those stretches as dead). The sine spends the same 2–3% evenly and still starts and
 * ends at rest, so a push can hand over to a portal (capture), a match (save) or a carry
 * (turn, writeback) without a jolt.
 */
export const DRIFT = { type: "bezier", p: [0.37, 0, 0.63, 1] as [number, number, number, number] } as const;
