import Database from "bun:sqlite";
import { DBTable } from "../table";
import { Exit } from "./exit";
import { GameMap } from "./game-map";
import { Item } from "./item";

type MapTileProps = {
  id: number;
  game_map_id: number;
  is_wall: boolean;
  x: number;
  y: number;
};

export type CreateMapTileProps = Omit<MapTileProps, "id">;

class MapTilesTable extends DBTable<CreateMapTileProps, MapTileProps> {
  tableName = "map_tiles";
}

export class MapTileManager {
  tileMap: Map<string, MapTile> = new Map();

  tileKey(tile: MapTile) {
    return `${tile.props.x},${tile.props.y}`;
  }

  constructor(public tiles: MapTile[]) {
    for (const tile of tiles) {
      this.tileMap.set(this.tileKey(tile), tile);
    }
    this.buildAdjacencies();
  }

  getTile(x: number, y: number) {
    return this.tileMap.get(`${x},${y}`);
  }

  saveAll(db: Database) {
    for (const tile of this.tiles) {
      tile.save(db);
    }
  }

  northOf(tile: MapTile, distance: number = 1) {
    return this.getTile(tile.props.x, tile.props.y - distance);
  }

  southOf(tile: MapTile, distance: number = 1) {
    return this.getTile(tile.props.x, tile.props.y + distance);
  }

  eastOf(tile: MapTile, distance: number = 1) {
    return this.getTile(tile.props.x + distance, tile.props.y);
  }

  westOf(tile: MapTile, distance: number = 1) {
    return this.getTile(tile.props.x - distance, tile.props.y);
  }

  buildAdjacencies() {
    for (const tile of this.tiles) {
      tile.adjacentUp = this.northOf(tile);
      tile.adjacentDown = this.southOf(tile);
      tile.adjacentLeft = this.westOf(tile);
      tile.adjacentRight = this.eastOf(tile);
    }
  }
}

export class MapTile {
  get xy() {
    return { x: this.props.x, y: this.props.y };
  }

  x() {
    return this.props.x;
  }

  y() {
    return this.props.y;
  }

  neighbors() {
    return this.adjacentTiles();
  }

  isTraversable() {
    return !this.props.is_wall && !this.isOccupied;
  }

  isOccupied = false;

  static table(db: Database) {
    return new MapTilesTable(db);
  }

  constructor(public props: MapTileProps) {}

  static create(db: Database, payload: CreateMapTileProps) {
    const row = MapTile.table(db).createRow(payload);

    if (row === null) throw new Error("Could not find created MapTile");

    return new MapTile(row);
  }

  static find(db: Database, id: number) {
    const row = MapTile.table(db).getRow(id);
    return new MapTile(row as MapTileProps);
  }

  static all(db: Database) {
    const rows = MapTile.table(db).allRows();
    return rows.map((row) => new MapTile(row as MapTileProps));
  }

  static where(db: Database, props: Partial<MapTileProps>) {
    const rows = MapTile.table(db).where(props);
    return rows.map((row) => new MapTile(row as MapTileProps));
  }

  distanceTo(otherTile: MapTile) {
    const distance = Math.sqrt(
      (this.props.x - otherTile.props.x) ** 2 +
        (this.props.y - otherTile.props.y) ** 2
    );
    return distance;
  }

  adjacentTiles() {
    const tiles = [];
    if (this.adjacentUp) tiles.push(this.adjacentUp);
    if (this.adjacentDown) tiles.push(this.adjacentDown);
    if (this.adjacentLeft) tiles.push(this.adjacentLeft);
    if (this.adjacentRight) tiles.push(this.adjacentRight);
    return tiles;
  }

  save(db: Database) {
    MapTile.table(db).updateRow(this.props.id, this.props);
  }

  private _attachedExit?: Exit | null;
  attachedExit(db: Database): Exit | null {
    if (this._attachedExit === undefined) {
      // NOTE: this won't show an exit if you're on the other side of it,
      // we'd need to also check the to_map_tile_id.
      const exits = Exit.table(db).where({ from_map_tile_id: this.props.id });
      if (exits.length > 0) {
        this._attachedExit = new Exit(exits[0]);
      } else {
        this._attachedExit = null;
      }
    }

    return this._attachedExit;
  }

  private _items: Item[] | undefined;
  getItems(db: Database) {
    if (this._items === undefined) {
      this._items = Item.table(db)
        .where({ tile_id: this.props.id })
        .map((row) => new Item(row));
    }
    return this._items;
  }

  refetchItems(db: Database) {
    this._items = undefined;
    return this.getItems(db);
  }

  getGameMap(db: Database) {
    return GameMap.table(db).getRow(this.props.game_map_id);
  }

  adjacentUp: MapTile | undefined | null;
  adjacentDown: MapTile | undefined | null;
  adjacentLeft: MapTile | undefined | null;
  adjacentRight: MapTile | undefined | null;
}
