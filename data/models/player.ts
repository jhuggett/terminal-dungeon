import { DBTable } from "../table";
import { MapTile, MapTileManager } from "./map-tile";
import { XY } from "@jhuggett/terminal/xy";
import { calculateFOV } from "../../field-of-view";
import { GameMap } from "./game-map";

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
  static table = new PlayersTable();

  constructor(public props: PlayerProps) {}

  save() {
    return Player.table.updateRow(this.props.id, this.props);
  }

  static async create(payload: CreatePlayerProps) {
    const row = await Player.table.createRow(payload);

    if (row === null) throw new Error("Could not find created Player");

    return new Player(row);
  }

  static async find(id: number) {
    const row = await Player.table.getRow(id);
    return new Player(row as PlayerProps);
  }

  static async all() {
    const rows = await Player.table.allRows();
    return rows.map((row) => new Player(row as PlayerProps));
  }

  static async where(props: Partial<PlayerProps>) {
    const rows = await Player.table.where(props);
    return rows.map((row) => new Player(row as PlayerProps));
  }

  private tile: MapTile | undefined;
  async getTile() {
    if (!this.tile)
      this.tile = (await MapTile.where({ id: this.props.tile_id }))[0];
    return this.tile;
  }

  get cachedTile() {
    return this.tile;
  }

  setTile(tile: MapTile) {
    if (this.tile) this.tile.isOccupied = false;

    this.tile = tile;
    this.props.tile_id = tile.props.id;

    tile.isOccupied = true;
  }

  async getGameMap() {
    const gameMap = await (await this.getTile()).getGameMap();
    return gameMap ? new GameMap(gameMap) : null;
  }

  visibleTiles(tileMapManger: MapTileManager) {
    const playerTile = this.cachedTile;

    if (!playerTile) return [];

    let tiles: MapTile[] = [];

    try {
      calculateFOV(
        playerTile.xy,
        (point: XY) => {
          const tile = tileMapManger.getTile(point.x, point.y);
          return !tile?.isTraversable() ?? false;
        },
        (point: XY) => {
          const tile = tileMapManger.getTile(point.x, point.y);
          if (tile) tiles.push(tile);
        },
        this.props.view_radius
      );
    } catch (e) {
      console.error(e);
    }

    return tiles;

    // const playerTile = this.getTile(db);

    // if (!playerTile) return [];

    // const tilesInViewDistance = tiles.filter((tile) => {
    //   const distance = playerTile.distanceTo(tile);

    //   return distance <= this.props.view_radius;
    // });

    // const tilesMap = new Map<string, MapTile>(
    //   tilesInViewDistance.map((tile) => [
    //     `${tile.props.x},${tile.props.y}`,
    //     tile,
    //   ])
    // );

    // const visibleTiles = getVisiblePoints(
    //   {
    //     x: playerTile.props.x,
    //     y: playerTile.props.y,
    //   },
    //   (point: XY) => {
    //     const tile = tilesMap.get(`${point.x},${point.y}`);

    //     if (!tile) return false;

    //     return tile?.isTraversable() ?? false;
    //   },
    //   this.props.view_radius
    // );

    // --------

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

    // ----

    // const x = Array.from(visibleTiles)
    //   .map((point) => {
    //     return tilesMap.get(`${point.x},${point.y}`);
    //   })
    //   .filter((tile) => tile !== undefined) as MapTile[];

    // return x;
  }
}
