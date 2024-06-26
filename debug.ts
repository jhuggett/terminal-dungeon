import { Element, OutOfBoundsError } from "@jhuggett/terminal/elements/element";
import { debugMode } from ".";

const LogLevels = [
  {
    name: "info",
    color: { r: 100, g: 255, b: 100, a: 1 },
    shorthand: "inf",
  },
  {
    name: "warning",
    color: { r: 255, g: 255, b: 100, a: 1 },
    shorthand: "wrn",
  },
  {
    name: "error",
    color: { r: 255, g: 100, b: 100, a: 1 },
    shorthand: "err",
  },
  {
    name: "debug",
    color: { r: 100, g: 100, b: 255, a: 1 },
    shorthand: "dbg",
  },
] as const;

type LogLevel = (typeof LogLevels)[number]["name"];

const Topics = [
  {
    name: "general",
    color: { r: 255, g: 255, b: 100, a: 1 },
    shorthand: "General",
  },
] as const;
type Topic = (typeof Topics)[number]["name"];

type Log = {
  topic: (typeof Topics)[number];
  level: (typeof LogLevels)[number];
  message: string;
  timestamp: Date;
};

export class Debug {
  maxLogs = 5000;

  element?: Element<void>;

  logs: Log[] = [];

  log(topic: Topic, level: LogLevel, message: any) {
    this.logs.unshift({
      level: LogLevels.find((l) => l.name === level)!,
      message: Bun.inspect(message).replaceAll("\t", ""),
      topic: Topics.find((t) => t.name === topic)!,
      timestamp: new Date(),
    });

    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (this.element) {
      this.element.render();
      this.element.shell.render();
    }
  }

  debug(message: any) {
    this.log("general", "debug", message);
  }

  info(message: any) {
    this.log("general", "info", message);
  }

  warning(message: any) {
    this.log("general", "warning", message);
  }

  error(message: any) {
    this.log(
      "general",
      "error",
      message instanceof Error ? message.stack : message
    );
  }

  registerElement(element: Element<any>) {
    element.renderer = ({ cursor, bounds }) => {
      cursor.properties.backgroundColor = { r: 14, g: 10, b: 10, a: 1 };
      cursor.properties.foregroundColor = { r: 25, g: 25, b: 25, a: 1 };
      cursor.fill(".");
      cursor.properties.foregroundColor = { r: 200, g: 200, b: 200, a: 1 };

      let availableHeight = bounds.height - 1;

      for (const log of this.logs) {
        const timestamp = log.timestamp.toLocaleTimeString();
        const topic = log.topic.shorthand;
        const level = log.level.shorthand;
        const message = log.message.replaceAll("\n", "");

        const length =
          timestamp.length +
          1 +
          topic.length +
          1 +
          level.length +
          1 +
          message.length;

        availableHeight -= Math.ceil(length / bounds.width);

        if (availableHeight <= 0) {
          break;
        }

        cursor.moveTo({ x: 2, y: availableHeight });

        try {
          cursor.write(timestamp + " ", {
            foregroundColor: { r: 100, g: 100, b: 100, a: 1 },
          });
          cursor.write(topic + " ", {
            foregroundColor: log.topic.color,
          });
          cursor.write(level + " ", {
            foregroundColor: log.level.color,
          });
          cursor.write(message, {
            foregroundColor: { r: 255, g: 255, b: 255, a: 1 },
          });
        } catch (error) {
          if (error instanceof OutOfBoundsError) {
            break;
          } else {
            throw error;
          }
        }
      }
    };

    this.element = element;

    element.render();
    this.element.shell.render();
  }
}
