import type { EaseSpec, PropRange } from "./types.js";

/**
 * Match cuts from a moving partner (match v2): what the runtime writes into a match's velocity
 * tweens at prepare (runtime resolveMeasured). Pure, so the motion is tested without a browser.
 */

/**
 * A match cut carries its partner's speed through the cut (match v2) from this speed up, in the
 * incoming element's own px per second: 2 px a frame at 30fps. Below it the partner reads as at
 * rest, and the match settles from rest as it always did.
 */
export const MATCH_SPEED = 60;

/** match: below this offset (own px) an axis has nowhere to travel; the partner's speed there is an impulse. */
const MATCH_STILL = 0.5;

/**
 * match v2, one axis of the incoming element's travel when its partner is moving at the cut
 * (resolveMeasured, at prepare): `v` the partner's velocity on that axis, `delta` where the element
 * starts relative to its own place (both in its own px). One cubic Hermite from `delta` to 0: it
 * leaves the cut at exactly `v` and arrives at rest (start slope m = −v·d/delta, end slope 0;
 * the bezier's y is unclamped, so it may overshoot or start backwards). The speed only falls when
 * delta lies ⅓–⅔ of v·d along the travel; further out it must speed up after the cut, nearer it
 * overshoots and comes back. With no travel on the axis, the speed is an impulse (the Hermite's
 * own limit): out at v, back to 0.
 */
export function matchTravel(v: number, delta: number, d: number): { range: PropRange; ease: EaseSpec } {
  if (Math.abs(delta) < MATCH_STILL) return { range: [0, Math.round(((4 * v * d) / 27) * 10000) / 10000], ease: { type: "impulse" } };
  return { range: [delta, 0], ease: { type: "bezier", p: [1 / 3, (-v * d) / delta / 3, 2 / 3, 1] } };
}
