import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import { Game } from "./game";

// With Photon credentials in .env, serve the iMessage line; otherwise play locally in the terminal.
const useImessage = Boolean(process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET);

// Log only the last 4 digits of phone numbers.
const mask = (id: string | undefined) => (id ? `…${id.slice(-4)}` : "unknown");

let app: Awaited<ReturnType<typeof Spectrum>>;
try {
  app = await Spectrum({
    providers: [useImessage ? imessage.config() : terminal.config()],
  });
} catch (err) {
  console.error("[bot] failed to connect to Photon. Check SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET in .env.");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

console.log(`[bot] Lose Gill Bates Money is live on ${useImessage ? "iMessage" : "the terminal"}. Waiting for messages…`);

const games = new Map<string, Game>();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log("[bot] shutting down");
    await app.stop();
    process.exit(0);
  });
}

for await (const [space, message] of app.messages) {
  try {
    console.log(`[bot] ${message.platform} message from ${mask(message.sender?.id)} (${message.content.type})`);
    if (message.content.type !== "text") {
      await space.send("I only read text. Pick A, B, C, or D!");
      continue;
    }

    let game = games.get(space.id);
    if (!game) games.set(space.id, (game = new Game()));

    for (const reply of game.handle(message.content.text)) {
      await space.send(reply);
    }
  } catch (err) {
    console.error("[bot] failed to handle message:", err instanceof Error ? err.message : err);
  }
}
