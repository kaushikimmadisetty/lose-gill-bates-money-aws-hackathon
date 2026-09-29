import { ATTACKS, ATTACK_DEFINITIONS, SCENARIOS, type Option, type Scenario } from "./scenarios";

export const STARTING_BALANCE = 100_000_000_000;
export const ROUNDS = 3;
const LETTERS = ["A", "B", "C", "D"] as const;

type Phase = "new" | "playing" | "over";

interface Pick {
  scenario: Scenario;
  chosen: Option;
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const bestOf = (s: Scenario) => s.options.reduce((a, b) => (b.drain > a.drain ? b : a));

/**
 * One player's game. The code owns the balance, rounds, and scoring so the
 * numbers are always right; the text comes from the scenario bank.
 */
export class Game {
  private phase: Phase = "new";
  private balance = STARTING_BALANCE;
  private rounds: Scenario[] = [];
  private options: Option[] = [];
  private picks: Pick[] = [];

  constructor(private random: () => number = Math.random) {}

  /** Handle one player message and return the host's replies, in order. */
  handle(input: string): string[] {
    const text = input.trim();
    if (this.phase === "new") return this.start();
    if (this.phase === "over") return this.afterGame(text);

    const letter = text.match(/^\(?([a-z])\)?[.!]?$/i)?.[1]?.toUpperCase();
    const index = LETTERS.indexOf(letter as (typeof LETTERS)[number]);
    if (index !== -1) return this.choose(this.options[index]!);
    if (letter) return [`Nice try, but there's no secret door ${letter}! 😄 Pick A, B, C, or D.`];
    if (/\?|\bwhy\b|\bwhat\b|\bhow\b|\bdifferen/i.test(text)) return [this.explain()];
    return ["Pick a letter to make your move: A, B, C, or D."];
  }

  private start(): string[] {
    this.phase = "playing";
    this.balance = STARTING_BALANCE;
    this.picks = [];
    this.rounds = shuffle(SCENARIOS, this.random).slice(0, ROUNDS);
    return [
      `Welcome, hacker! Gill Bates is loaded. Let's make him less loaded. 😈\n\n💰 Balance: ${money(this.balance)}`,
      this.roundPrompt(),
    ];
  }

  private roundPrompt(): string {
    const scenario = this.rounds[this.picks.length]!;
    this.options = shuffle(scenario.options, this.random);
    const lines = this.options.map((o, i) => `${LETTERS[i]}) ${ATTACKS[o.attack]}: ${o.text}`);
    return `Round ${this.picks.length + 1} of ${ROUNDS}\n${scenario.situation}\n\n${lines.join("\n")}\n\nPick A, B, C, or D!`;
  }

  private choose(chosen: Option): string[] {
    const scenario = this.rounds[this.picks.length]!;
    const best = bestOf(scenario);
    this.picks.push({ scenario, chosen });
    this.balance = Math.max(0, this.balance - chosen.drain);

    const parts = [`💸 -${money(chosen.drain)}`];
    if (chosen === best) {
      parts.push(`${chosen.whatHappens} Nailed it! That was the biggest drain.`);
    } else {
      parts.push(`${chosen.whatHappens} Nice haul!`);
      parts.push(`The biggest drain here was ${ATTACKS[best.attack]}, because ${scenario.bestReason}`);
    }
    parts.push(`🛡️ How to stop it: ${chosen.stopTip}`, `💰 Balance: ${money(this.balance)}`);
    const result = parts.join("\n\n");

    if (this.picks.length < ROUNDS) return [result, this.roundPrompt()];
    this.phase = "over";
    return [result, this.recap()];
  }

  private explain(): string {
    const defs = this.options.map((o, i) => `${LETTERS[i]}) ${ATTACKS[o.attack]} means ${ATTACK_DEFINITIONS[o.attack]}`);
    return `Good question! Here's what each move means:\n\n${defs.join("\n")}\n\nEvery choice drains some money, but one drains the most. Ready? Pick A, B, C, or D.`;
  }

  private recap(): string {
    const drained = STARTING_BALANCE - this.balance;
    const rows = this.picks.map(({ scenario, chosen }) => {
      const best = bestOf(scenario);
      const verdict = chosen === best ? "✅ You got it!" : `(you picked ${ATTACKS[chosen.attack]})`;
      return `${scenario.emoji} ${scenario.label} → ${ATTACKS[best.attack]} ${verdict}`;
    });
    const score = this.picks.filter(({ scenario, chosen }) => chosen === bestOf(scenario)).length;
    const mood = score === ROUNDS ? "Gill is broke-ish. 😱" : score > 0 ? "Gill is sweating. 😅" : "Gill is relieved... for now. 😏";
    return [
      "🏁 Game over!",
      `You drained ${money(drained)} from Gill Bates.\n💰 Final balance: ${money(this.balance)}`,
      `Best attack each round:\n\n${rows.join("\n")}`,
      `${score} out of ${ROUNDS}. ${mood} Want to play again with new situations? (Yes / No)`,
    ].join("\n\n");
  }

  private afterGame(text: string): string[] {
    if (/^(y|yes|yeah|yep|sure|ok|okay|again|play)/i.test(text)) return this.start();
    if (/^(n|no|nope|nah)/i.test(text)) {
      this.phase = "new";
      return ["Thanks for playing! Text me anytime to take another shot at Gill's fortune. 👋"];
    }
    return ["Want to play again? Reply Yes or No."];
  }
}
