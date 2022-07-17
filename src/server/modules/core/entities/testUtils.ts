import { Instance } from '@server/GameServerInstance';
import { ICharacterDefinition, Character, IPlayerDefinition, Player } from './character';
import { IItemDefinition, Item } from './item';
import { Room, IExitDefinition, Exit, IRoomDefinition } from './room';
import { IZoneDefinition, Zone } from './zone';

export const buildZone = (definition?: Partial<IZoneDefinition>, persist?: boolean) => {
  const zone = new Zone({ key: 'testZone', zoneName: 'Test zone', ...definition });
  if (persist) {
    Instance.gameServer?.catalog.registerZone(zone);
  }
  return zone;
};

export const buildRoom = (zone: Zone, key: string, definition?: Partial<IRoomDefinition>) => {
  return new Room({ key: key, roomName: `${key} name`, description: `${key} description`, exits: [], ...definition }, zone);
};

export const buildCharacter = (zone: Zone, key: string, room: Room, definition?: Partial<ICharacterDefinition>) => {
  const char = new Character(
    {
      key,
      name: `${key} name`,
      ...definition,
    },
    zone,
    room
  );
  jest.spyOn(char, 'emitTo').mockImplementation(() => undefined);
  return char;
};

export const buildPlayer = (key: string, room: Room, definition?: Partial<IPlayerDefinition>) => {
  const player = new Player({
    key,
    accountId: key,
    room: room.key,
    playerNumber: 1,
    name: `${key} name`,
    ...definition,
  });
  jest.spyOn(player, 'emitTo').mockImplementation(() => undefined);
  return player;
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
