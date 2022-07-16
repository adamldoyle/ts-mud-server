import fs from 'fs';
import { logger } from '@shared/Logger';
import { TimeOfDay } from '@modules/calendar';
import { buildZonedKey } from '@core/entities/catalog';
import { Base, Constructor } from './base';
import { ISavedRoomDefinition, Room } from './room';
import { Character } from './character';

export interface IZoneDefinition {
  key: string;
  zoneName: string;
}

export interface IKeyedEntity {
  key: string;
  zone: Zone;
}

export function KeyedEntity<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    key!: string;
    zone!: Zone;

    initializeKeyedEntity(key: string, zone: Zone) {
      this.key = buildZonedKey(key, zone);
      this.zone = zone;
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
    let savedRooms: ISavedRoomDefinition[] = [];
    try {
      if (fs.existsSync(`data/dumps/${this.key}.json`)) {
        const rawZone = fs.readFileSync(`data/dumps/${this.key}.json`, 'utf-8');
        savedRooms = JSON.parse(rawZone).rooms as ISavedRoomDefinition[];
      }
    } catch (err: any) {
      logger.error(err?.message);
    }
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

  toJson() {
    return {
      ...this.definition,
      rooms: Object.values(this.rooms).map((room) => room.toJson()),
    };
  }

  toString() {
    return this.styledName;
  }
}
