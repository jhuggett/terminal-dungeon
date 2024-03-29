import { BunShell } from "@jhuggett/terminal";
import { getDBConnection } from "./data/database";
import { MainMenuPage } from "./pages/main-menu/main-menu";
import { Debug } from "./debug";
import { within } from "@jhuggett/terminal/bounds/bounds";

export const db = await getDBConnection();
export const konsole = new Debug();

const shell = new BunShell();
shell.showCursor(false);
shell.clear();

const root = shell.rootElement;

shell.onWindowResize(() => {
  shell.invalidateCachedSize();
  shell.clear();
  root.recalculateBounds();
  shell.render();
});

const debugMode = false;

let content = root.createChildElement(() => {
  return {
    start: {
      x: root.bounds.globalStart.x,
      y: root.bounds.globalStart.y,
    },
    end: {
      x: root.bounds.globalEnd.x,
      y: root.bounds.globalEnd.y,
    },
  };
}, {});

if (debugMode) {
  content = root.createChildElement(() => {
    return {
      start: {
        x: root.bounds.globalStart.x,
        y: root.bounds.globalStart.y,
      },
      end: {
        x: Math.floor(root.bounds.globalEnd.x / 2),
        y: root.bounds.globalEnd.y,
      },
    };
  }, {});

  const debugElement = root.createChildElement(() => {
    return {
      start: {
        x: Math.floor(root.bounds.globalEnd.x / 2),
        y: root.bounds.globalStart.y,
      },
      end: {
        x: root.bounds.globalEnd.x,
        y: root.bounds.globalEnd.y,
      },
    };
  }, {});

  konsole.registerElement(debugElement);
}

const mainMenu = new MainMenuPage(content, shell);

konsole.log("general", "info", "Starting main menu");

try {
  await mainMenu.serve();
} catch (error) {
  //konsole.log("general", "error", error);
  console.error(error);
}

shell.showCursor(true);

db.close();
