import Database from "bun:sqlite";
import { DBTable } from "../table";
import { MapTile } from "./map-tile";
import { getVisiblePoints } from "../../shadowcast";
import { XY } from "@jhuggett/terminal/xy";

type PlayerProps = {
  id: number;

  view_radius: number;

  save_id: number;
  tile_id: number;
};

export type CreatePlayerProps = Omit<PlayerProps, "id" | "created_at">;

class PlayersTable extends DBTable<CreatePlayerProps, PlayerProps> {
  tableName = "players";
}

export class Player {
  static table(db: Database) {
    return new PlayersTable(db);
  }

  constructor(public props: PlayerProps) {}

  save(db: Database) {
    Player.table(db).updateRow(this.props.id, this.props);
  }

  static create(db: Database, payload: CreatePlayerProps) {
    const row = Player.table(db).createRow(payload);

    if (row === null) throw new Error("Could not find created Player");

    return new Player(row);
  }

  static find(db: Database, id: number) {
    const row = Player.table(db).getRow(id);
    return new Player(row as PlayerProps);
  }

  static all(db: Database) {
    const rows = Player.table(db).allRows();
    return rows.map((row) => new Player(row as PlayerProps));
  }

  static where(db: Database, props: Partial<PlayerProps>) {
    const rows = Player.table(db).where(props);
    return rows.map((row) => new Player(row as PlayerProps));
  }

  getTile(db: Database) {
    return MapTile.where(db, { id: this.props.tile_id })[0];
  }

  visibleTiles(db: Database) {
    const playerTile = this.getTile(db);

    if (!playerTile) return [];

    const tiles = MapTile.where(db, {
      game_map_id: playerTile.props.game_map_id,
    });

    const tilesInViewDistance = tiles.filter((tile) => {
      const distance = playerTile.distanceTo(tile);

      return distance <= this.props.view_radius;
    });

    const tilesMap = new Map<string, MapTile>(
      tilesInViewDistance.map((tile) => [
        `${tile.props.x},${tile.props.y}`,
        tile,
      ])
    );

    const visibleTiles = getVisiblePoints(
      {
        x: playerTile.props.x,
        y: playerTile.props.y,
      },
      (point: XY) => {
        const tile = tilesMap.get(`${point.x},${point.y}`);

        if (!tile) return false;

        return !tile.props.is_wall;
      },
      this.props.view_radius
    );

    // const visibleTiles = tilesInViewDistance.filter((tile) => {
    //   const x1 = playerTile.props.x;
    //   const y1 = playerTile.props.y;
    //   const x2 = tile.props.x;
    //   const y2 = tile.props.y;

    //   const dx = x2 - x1;
    //   const dy = y2 - y1;

    //   let x = x1;
    //   let y = y1;

    //   let lastTile: MapTile | undefined = undefined;

    //   while (x !== x2 || y !== y2) {
    //     if (x !== x2) {
    //       x += dx / Math.abs(dx);
    //     }

    //     if (y !== y2) {
    //       y += dy / Math.abs(dy);
    //     }

    //     const tileAtPoint = tilesMap.get(`${Math.round(x)},${Math.round(y)}`);

    //     if (tileAtPoint && lastTile?.props.is_wall) {
    //       return false;
    //     }
    //     lastTile = tileAtPoint;
    //   }

    //   return true;
    // });

    const x = Array.from(visibleTiles)
      .map((point) => {
        return tilesMap.get(`${point.x},${point.y}`);
      })
      .filter((tile) => tile !== undefined) as MapTile[];

    return x;
  }
}
