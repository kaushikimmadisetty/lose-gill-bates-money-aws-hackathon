import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import { Game } from "./game";

// With Photon credentials in .env, serve the iMessage line; otherwise play locally in the terminal.
const useImessage = Boolean(process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET);

const app = await Spectrum({
  providers: [useImessage ? imessage.config() : terminal.config()],
});

const games = new Map<string, Game>();

for await (const [space, message] of app.messages) {
  if (message.content.type !== "text") {
    await space.send("I only read text. Pick A, B, C, or D!");
    continue;
  }

  let game = games.get(space.id);
  if (!game) games.set(space.id, (game = new Game()));

  for (const reply of game.handle(message.content.text)) {
    await space.send(reply);
  }
}
