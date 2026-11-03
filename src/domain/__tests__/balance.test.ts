// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { expect, it } from "vite-plus/test";
import { balance } from "../balance";

it("balance constants are positive", () => {
  expect(balance.heroSpeed).toBeGreaterThan(0);
});
