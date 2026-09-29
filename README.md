# Lose Gill Bates Money AWS Hackathon

A text game that teaches teens about AI security risks. Billionaire Gill Bates trusts an AI helper named LEDGER with his $100,000,000,000 fortune. You play a hacker who picks the best attack in each of 3 rounds to drain it.

Players text the game over iMessage through [Photon Spectrum](https://photon.codes/docs/spectrum-ts/introduction).

## Run it

```bash
bun install
bun start      # plays in your terminal when no Photon credentials are set
bun test
```

To serve a real iMessage line, copy `.env.example` to `.env` and fill in the project ID and secret from your Photon project settings.

## How it's built

- `src/game.ts` is the game engine. The code tracks the balance, rounds, and scoring, so the math is always right.
- `src/scenarios.ts` is the bank of rounds. Each one has four attacks, their drain amounts, and a "How to stop it" tip.
- `src/bot.ts` connects the engine to Photon. Each chat gets its own game.
- `prompts/game-host.md` has the original game rules. It will become the system prompt once an LLM writes the host's text.
