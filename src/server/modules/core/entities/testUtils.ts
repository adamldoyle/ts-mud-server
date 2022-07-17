import { ICharacterDefinition, Character } from './character';
import { IItemDefinition, Item } from './item';
import { Room, IExitDefinition, Exit, IRoomDefinition } from './room';
import { IZoneDefinition, Zone } from './zone';

export const buildZone = (definition?: Partial<IZoneDefinition>) => {
  return new Zone({ key: 'testZone', zoneName: 'Test zone', ...definition });
};

export const buildRoom = (zone: Zone, key: string, definition?: Partial<IRoomDefinition>) => {
  return new Room({ key: key, roomName: `${key} name`, description: `${key} description`, exits: [], ...definition }, zone);
};

export const buildCharacter = (zone: Zone, key: string, room: Room, definition?: Partial<ICharacterDefinition>) => {
  return new Character(
    {
      key,
      name: `${key} name`,
      ...definition,
    },
    zone,
    room
  );
};

export const buildItem = (zone: Zone, key: string, definition?: Partial<IItemDefinition>) => {
  return new Item(
    {
      key,
      name: `${key} name`,
      ...definition,
    },
    zone
  );
};

export const buildExit = (room: Room, destination: Room, direction: string, definition?: Partial<IExitDefinition>): Exit => {
  const exit = new Exit(
    {
      direction,
      destination: destination.key,
      ...definition,
    },
    destination
  );
  room.exits[direction] = exit;
  return exit;
};
