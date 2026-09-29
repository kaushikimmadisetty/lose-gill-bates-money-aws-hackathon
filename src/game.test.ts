import { describe, expect, test } from "bun:test";
import { Game, STARTING_BALANCE, money } from "./game";
import { SCENARIOS } from "./scenarios";

// Deterministic "random" so shuffles are repeatable.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const balanceIn = (reply: string) => Number(reply.match(/Balance: \$([\d,]+)/)![1]!.replace(/,/g, ""));

describe("scenario bank", () => {
  test.each(SCENARIOS.map((s) => [s.id, s] as const))("%s has four distinct attacks and one clear best", (_, s) => {
    expect(new Set(s.options.map((o) => o.attack)).size).toBe(4);
    const drains = s.options.map((o) => o.drain).sort((a, b) => b - a);
    expect(drains[0]).toBeGreaterThan(drains[1]!);
    expect(drains.every((d) => d > 0)).toBe(true);
  });
});

describe("Game", () => {
  test("first message shows intro, balance, and round 1 without dollar amounts", () => {
    const [intro, round] = new Game(seeded(1)).handle("hi");
    expect(intro).toContain(`Balance: ${money(STARTING_BALANCE)}`);
    expect(round).toMatch(/^Round 1 of 3/);
    expect(round).toMatch(/^A\) .*\nB\) .*\nC\) .*\nD\) /m);
    expect(round).not.toContain("$");
  });

  test("plays three rounds with no repeats, and the balance math adds up", () => {
    const game = new Game(seeded(7));
    game.handle("start");
    const situations = new Set<string>();
    let balance = STARTING_BALANCE;
    let replies: string[] = [];
    for (const pick of ["A", "b", "C"]) {
      replies = game.handle(pick);
      const drain = Number(replies[0]!.match(/-\$([\d,]+)/)![1]!.replace(/,/g, ""));
      balance -= drain;
      expect(balanceIn(replies[0]!)).toBe(balance);
      expect(replies[0]).toContain("How to stop it:");
      if (replies[1]!.startsWith("Round")) situations.add(replies[1]!.split("\n")[1]!);
    }
    expect(situations.size).toBe(2);
    expect(replies[1]).toContain("🏁 Game over!");
    expect(replies[1]).toContain(`Final balance: ${money(balance)}`);
    expect(replies[1]).toContain(`You drained ${money(STARTING_BALANCE - balance)}`);
  });

  test("names the biggest drain only when the player missed it", () => {
    // Letter of the best (or a non-best) option in a round prompt.
    const letterFor = (round: string, wantBest: boolean) => {
      const scenario = SCENARIOS.find((s) => round.includes(s.situation))!;
      const best = scenario.options.reduce((a, b) => (b.drain > a.drain ? b : a));
      const line = round.split("\n").find((l) => /^[A-D]\) /.test(l) && l.endsWith(best.text) === wantBest)!;
      return line[0]!;
    };
    const game = new Game(seeded(3));
    const round1 = game.handle("go")[1]!;
    const [hit, round2] = game.handle(letterFor(round1, true));
    expect(hit).toContain("Nailed it!");
    expect(hit).not.toContain("The biggest drain here was");
    const [miss] = game.handle(letterFor(round2!, false));
    expect(miss).toContain("The biggest drain here was");
  });

  test("rejects non-letters and explains on why", () => {
    const game = new Game(seeded(2));
    game.handle("hey");
    expect(game.handle("E")[0]).toContain("no secret door E");
    expect(game.handle("banana")[0]).toContain("Pick a letter");
    expect(game.handle("why is D different from C?")[0]).toContain("Good question!");
  });

  test("offers a replay and starts fresh on yes", () => {
    const game = new Game(seeded(5));
    game.handle("hey");
    game.handle("A");
    game.handle("A");
    game.handle("A");
    expect(game.handle("maybe")[0]).toContain("Yes or No");
    const [intro] = game.handle("yes");
    expect(intro).toContain(`Balance: ${money(STARTING_BALANCE)}`);
  });
});
