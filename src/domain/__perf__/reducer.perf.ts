import { measure } from "../../../perf/harness";
import type { GameEvent } from "../events";
import { reduce } from "../reducer";
import { initialState } from "../state";

// A fixed, deterministic sequence of 1,000 events.
const events: GameEvent[] = [];
let seed = 1;
for (let i = 0; i < 1000; i += 1) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  const pick = seed % 10;
  if (pick === 0) events.push({ type: "SetLang", lang: seed % 2 ? "ja" : "en" });
  else if (pick === 1) events.push({ type: "Start" });
  else events.push({ type: "MoveHeroTo", x: seed % 390, y: seed % 844 });
}

measure("reduce 1,000 events", () => events.reduce(reduce, initialState));
