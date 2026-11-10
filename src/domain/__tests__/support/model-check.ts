/**
 * Explicit-state model checking over the real reducer: breadth-first search of every state
 * reachable from `initial` through a finite event alphabet. Property tests sample random event
 * sequences; this visits every reachable state once, so a rare state cannot be missed.
 *
 * Checks, each reported with the shortest event trace that reaches the bad state:
 * - invariants: a predicate that must hold in every reachable state (TLA+ `[]P`);
 * - goal: from every reachable state some goal state is still reachable (`[]<>`-style
 *   "no soft-lock": a child can always finish, whatever they tapped before).
 */
export type Model<S, E> = {
  initial: S;
  /** Events to try in a state. Keep the alphabet small and representative. */
  events: (state: S) => readonly E[];
  step: (state: S, event: E) => S;
  invariants: Record<string, (state: S) => boolean>;
  goal?: ((state: S) => boolean) | undefined;
  /** Identity of a state; defaults to JSON. Abstract away fields that do not matter. */
  key?: (state: S) => string;
  /** The search fails instead of running forever when the model is larger than this. */
  maxStates?: number;
};

type Violation<S, E> = {
  kind: "invariant" | "stuck";
  name: string;
  state: S;
  trace: E[];
};

export type ModelReport<S, E> = { states: number; violations: Violation<S, E>[] };

/** `from` is the predecessor on a shortest path from the initial state, and the event taken. */
type Node<S, E> = { state: S; from: { key: string; event: E } | null; next: Set<string> };

function traceTo<S, E>(nodes: Map<string, Node<S, E>>, key: string): E[] {
  const trace: E[] = [];
  for (let from = nodes.get(key)?.from; from; from = nodes.get(from.key)?.from) {
    trace.unshift(from.event);
  }
  return trace;
}

function explore<S, E>(model: Model<S, E>, key: (s: S) => string): Map<string, Node<S, E>> {
  const max = model.maxStates ?? 100_000;
  const start = key(model.initial);
  const nodes = new Map<string, Node<S, E>>([
    [start, { state: model.initial, from: null, next: new Set() }],
  ]);
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const from = queue[i]!;
    const node = nodes.get(from)!;
    for (const event of model.events(node.state)) {
      const state = model.step(node.state, event);
      const to = key(state);
      node.next.add(to);
      if (nodes.has(to)) continue;
      if (nodes.size >= max) throw new Error(`model has more than ${max} states; abstract it`);
      nodes.set(to, { state, from: { key: from, event }, next: new Set() });
      queue.push(to);
    }
  }
  return nodes;
}

/** States from which no goal state can be reached (backward search from the goal states). */
function stuckStates<S, E>(nodes: Map<string, Node<S, E>>, goal: (s: S) => boolean): string[] {
  const back = new Map<string, string[]>();
  for (const [from, node] of nodes) {
    for (const to of node.next) {
      const prevs = back.get(to) ?? [];
      prevs.push(from);
      back.set(to, prevs);
    }
  }
  const canFinish = new Set([...nodes].filter(([, n]) => goal(n.state)).map(([k]) => k));
  const queue = [...canFinish];
  for (let i = 0; i < queue.length; i += 1) {
    for (const prev of back.get(queue[i]!) ?? []) {
      if (canFinish.has(prev)) continue;
      canFinish.add(prev);
      queue.push(prev);
    }
  }
  return [...nodes.keys()].filter((k) => !canFinish.has(k));
}

export function checkModel<S, E>(model: Model<S, E>): ModelReport<S, E> {
  const key = model.key ?? ((s: S) => JSON.stringify(s));
  const nodes = explore(model, key);
  const violations: Violation<S, E>[] = [];
  for (const [name, holds] of Object.entries(model.invariants)) {
    const bad = [...nodes].find(([, n]) => !holds(n.state));
    if (bad) {
      violations.push({
        kind: "invariant",
        name,
        state: bad[1].state,
        trace: traceTo(nodes, bad[0]),
      });
    }
  }
  if (model.goal) {
    const [stuck] = stuckStates(nodes, model.goal);
    if (stuck !== undefined) {
      const state = nodes.get(stuck)!.state;
      violations.push({ kind: "stuck", name: "goal", state, trace: traceTo(nodes, stuck) });
    }
  }
  return { states: nodes.size, violations };
}
