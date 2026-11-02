// Scaffold stub: replaced by .kiro/specs/01-core-loop

export type Lang = "ja" | "en";

export type GameState = {
  phase: "title" | "trial";
  lang: Lang;
  trial: number;
  hero: { x: number; y: number };
  charms: string[];
};

export const initialState: GameState = {
  phase: "title",
  lang: "en",
  trial: 0,
  hero: { x: 195, y: 600 },
  charms: [],
};
