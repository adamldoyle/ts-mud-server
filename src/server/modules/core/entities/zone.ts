import fs from 'fs';
import { logger } from '@shared/Logger';
import { TimeOfDay } from '@modules/calendar';
import { Base, Constructor } from './base';
import { ISavedRoomDefinition, Room } from './room';
import { Character } from './character';

export interface IZoneDefinition {
  key: string;
  zoneName: string;
}

export interface ISavedZoneDefinition extends IZoneDefinition {
  rooms: ISavedRoomDefinition[];
}

export interface IKeyedEntity {
  key: string;
  zone: Zone;
}

export const buildZonedKey = (key: string, zone: Zone): string => {
  if (!key) {
    throw new Error(`No key provied to buildZonedKey`);
  }
  const pieces = key.split('@');
  if (pieces.length === 2) {
    return key;
  }
  if (pieces.length === 1) {
    return `${key}@${zone.key}`;
  }
  throw new Error(`Invalid format: ${key}`);
};

export const splitZonedKey = (zonedKey: string): { key: string; zoneKey: string } => {
  const pieces = zonedKey.split('@');
  if (pieces.length !== 2) {
    throw new Error(`Invalid zoned key: ${zonedKey}`);
  }
  const [key, zoneKey] = pieces;
  return { key, zoneKey };
};

export function KeyedEntity<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    key!: string;
    zone!: Zone;
    basicKey!: string;

    initializeKeyedEntity(key: string, zone: Zone) {
      this.key = buildZonedKey(key, zone);
      this.zone = zone;
      this.basicKey = splitZonedKey(this.key).key;
    }
  };
}

export const BaseKeyedEntity = KeyedEntity(Base);

export class Zone {
  definition: IZoneDefinition;
  key: string;
  zoneName: string;
  styledName: string;
  rooms: Record<string, Room>;
  characters: Character[];

  constructor(definition: IZoneDefinition) {
    this.definition = definition;
    this.key = definition.key;
    this.zoneName = definition.zoneName;
    this.styledName = `<R>${this.zoneName}<n>`;
    this.rooms = {};
    this.characters = [];
  }

  addRoom(room: Room) {
    if (this.rooms[room.key]) {
      return logger.error(`Room key already used: ${room.key}`);
    }

    this.rooms[room.key] = room;
    room.zone = this;
  }

  finalize() {
    const savedZone = Zone.fromStorage(this.key);
    const savedRooms = savedZone?.rooms ?? [];
    Object.values(this.rooms).forEach((room) => {
      const savedRoom = savedRooms.find((savedRoom) => room.key === savedRoom.key);
      room.finalize(savedRoom);
    });
  }

  addCharacter(character: Character) {
    this.characters.push(character);
  }

  removeCharacter(character: Character) {
    this.characters = this.characters.filter((otherChar) => otherChar !== character);
  }

  reset() {
    Object.values(this.rooms).forEach((room) => {
      room.reset();
    });
  }

  newTimeOfDay(timeOfDay: TimeOfDay) {
    this.reset();
    Object.values(this.rooms).forEach((room) => {
      room.newTimeOfDay(timeOfDay);
    });
  }

  tick(tickCounter: number) {
    Object.values(this.rooms).forEach((room) => {
      room.tick(tickCounter);
    });
    this.characters.forEach((character) => {
      character.tick(tickCounter);
    });
  }

  toJson(): ISavedZoneDefinition {
    return {
      ...this.definition,
      rooms: Object.values(this.rooms).map((room) => room.toJson()),
    };
  }

  toStorage() {
    fs.writeFileSync(`data/dumps/${this.key}.json`, JSON.stringify(this.toJson(), null, 2), {
      encoding: 'utf-8',
    });
  }

  static fromStorage(key: string): ISavedZoneDefinition | undefined {
    if (fs.existsSync(`data/dumps/${key}.json`)) {
      const rawZone = fs.readFileSync(`data/dumps/${key}.json`, 'utf-8');
      return JSON.parse(rawZone) as ISavedZoneDefinition;
    }
    return undefined;
  }

  toString() {
    return this.styledName;
  }
}
