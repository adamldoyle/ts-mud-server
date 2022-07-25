import { Instance } from '@server/GameServerInstance';
import { calculateTime, TimeOfDay } from '@server/modules/calendar';
import { buildCharacter, buildItem, buildPlayer, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { ICommandDefinition } from '../commands/CommandHandler';
import { Character, ICharacterDefinition, Player } from './character';
import { IItemDefinition } from './item';
import * as rooms from './room';
import { Zone } from './zone';

describe('core/entities/room', () => {
  let zone: Zone;
  let origin: rooms.Room;
  let npc: Character;
  let player: Player;
  beforeEach(() => {
    initializeTestServer();
    zone = buildZone({}, true);
    origin = buildRoom(zone, 'origin');
    npc = buildCharacter(zone, 'npc', origin);
    player = buildPlayer('npc', origin);
  });

  describe('Exit', () => {
    let destination: rooms.Room;
    beforeEach(() => {
      destination = buildRoom(zone, 'destination');
    });

    describe('constructor', () => {
      test('builds out exit based on definition and origin', () => {
        const definition: rooms.IExitDefinition = {
          direction: 'north',
          destination: 'destination@testZone',
          flags: [rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED],
        };
        const exit = new rooms.Exit(definition, origin);
        expect(exit.definition).toEqual(definition);
        expect(exit.direction).toEqual('north');
        expect(exit.destination).toEqual(destination);
        expect(exit.flags.flags).toEqual(rooms.ExitFlag.DOOR | rooms.ExitFlag.CLOSED);
      });
    });

    const buildExit = (flags: rooms.ExitFlag[]): rooms.Exit => {
      return new rooms.Exit(
        {
          direction: 'north',
          destination: 'destination@testZone',
          flags,
        },
        origin
      );
    };

    describe('canView', () => {
      test('false when secret, true otherwise', () => {
        const exit = buildExit([]);
        const secretExit = buildExit([rooms.ExitFlag.SECRET]);
        expect(exit.canView(npc)).toBeTruthy();
        expect(exit.canView(player)).toBeTruthy();
        expect(secretExit.canView(npc)).toBeFalsy();
        expect(secretExit.canView(player)).toBeFalsy();
      });
    });

    describe('isClosed', () => {
      test('true when closed, false otherwise', () => {
        const exit = buildExit([]);
        const closedExit = buildExit([rooms.ExitFlag.CLOSED]);
        expect(exit.isClosed()).toBeFalsy();
        expect(closedExit.isClosed()).toBeTruthy();
      });
    });

    describe('canOpen', () => {
      test('returns true if closed door', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.canOpen(npc)).toBeTruthy();
        expect(exit.canOpen(player)).toBeTruthy();
      });

      test('returns false if door is marked NOMOB (unless by player)', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED, rooms.ExitFlag.NOMOB]);
        expect(exit.canOpen(npc)).toBeFalsy();
        expect(exit.canOpen(player)).toBeTruthy();
      });

      test('returns false if not closed', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.canOpen(npc)).toBeFalsy();
        expect(exit.canOpen(player)).toBeFalsy();
      });

      test('returns false if not a door', () => {
        const exit = buildExit([]);
        expect(exit.canOpen(npc)).toBeFalsy();
        expect(exit.canOpen(player)).toBeFalsy();
      });
    });

    describe('canClose', () => {
      test('returns true if open door', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.canClose(npc)).toBeTruthy();
        expect(exit.canClose(player)).toBeTruthy();
      });

      test('returns false if door is marked NOMOB (unless by player)', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.NOMOB]);
        expect(exit.canClose(npc)).toBeFalsy();
        expect(exit.canClose(player)).toBeTruthy();
      });

      test('returns false if not open', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.canClose(npc)).toBeFalsy();
        expect(exit.canClose(player)).toBeFalsy();
      });

      test('returns false if not a door', () => {
        const exit = buildExit([]);
        expect(exit.canClose(npc)).toBeFalsy();
        expect(exit.canClose(player)).toBeFalsy();
      });
    });

    describe('open', () => {
      test('opens door if closed door', () => {
        let exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.open(npc)).toBeTruthy();
        expect(exit.isClosed()).toBeFalsy();
        exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.open(player)).toBeTruthy();
        expect(exit.isClosed()).toBeFalsy();
      });

      test('fails if door is marked NOMOB, opened if done by player', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED, rooms.ExitFlag.NOMOB]);
        expect(exit.open(npc)).toBeFalsy();
        expect(exit.open(player)).toBeTruthy();
        expect(exit.isClosed()).toBeFalsy();
      });

      test('fails if not closed', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.open(npc)).toBeFalsy();
        expect(exit.open(player)).toBeFalsy();
      });

      test('fails if not a door', () => {
        const exit = buildExit([]);
        expect(exit.open(npc)).toBeFalsy();
        expect(exit.open(player)).toBeFalsy();
      });
    });

    describe('close', () => {
      test('closes door if open door', () => {
        let exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.close(npc)).toBeTruthy();
        expect(exit.isClosed()).toBeTruthy();
        exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.close(player)).toBeTruthy();
        expect(exit.isClosed()).toBeTruthy();
      });

      test('fails if door is marked NOMOB, closed if done by player', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.NOMOB]);
        expect(exit.close(npc)).toBeFalsy();
        expect(exit.close(player)).toBeTruthy();
        expect(exit.isClosed()).toBeTruthy();
      });

      test('fails if not open', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.close(npc)).toBeFalsy();
        expect(exit.close(player)).toBeFalsy();
      });

      test('fails if not a door', () => {
        const exit = buildExit([]);
        expect(exit.close(npc)).toBeFalsy();
        expect(exit.close(player)).toBeFalsy();
      });
    });

    describe('canPass', () => {
      test('returns true if basic exit', () => {
        const exit = buildExit([]);
        expect(exit.canPass(npc)).toBeTruthy();
        expect(exit.canPass(player)).toBeTruthy();
      });

      test('returns true if open door', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.canPass(npc)).toBeTruthy();
        expect(exit.canPass(player)).toBeTruthy();
      });

      test('returns false if door is marked NOMOB (unless by player)', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.NOMOB]);
        expect(exit.canPass(npc)).toBeFalsy();
        expect(exit.canPass(player)).toBeTruthy();
      });

      test('returns false if not open', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.canPass(npc)).toBeFalsy();
        expect(exit.canPass(player)).toBeFalsy();
      });
    });

    describe('canPeek', () => {
      test('returns true if basic exit', () => {
        const exit = buildExit([]);
        expect(exit.canPeek(npc)).toBeTruthy();
        expect(exit.canPeek(player)).toBeTruthy();
      });

      test('returns true if open door', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR]);
        expect(exit.canPeek(npc)).toBeTruthy();
        expect(exit.canPeek(player)).toBeTruthy();
      });

      test('not impacted by NOMOB', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.NOMOB]);
        expect(exit.canPeek(npc)).toBeTruthy();
        expect(exit.canPeek(player)).toBeTruthy();
      });

      test('returns false if not open', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.canPeek(npc)).toBeFalsy();
        expect(exit.canPeek(player)).toBeFalsy();
      });

      test('returns false if secret', () => {
        const exit = buildExit([rooms.ExitFlag.SECRET]);
        expect(exit.canPeek(npc)).toBeFalsy();
        expect(exit.canPeek(player)).toBeFalsy();
      });
    });

    describe('lookAt', () => {
      test('shows basic info for normal user', () => {
        const exit = buildExit([]);
        expect(exit.lookAt(npc)).toEqual('  - <y>       north<n> :: destination name');
      });

      test('includes destination key for admin user', () => {
        npc.admin = true;
        const exit = buildExit([]);
        expect(exit.lookAt(npc)).toEqual('  - <y>       north<n> :: destination name [destination@testZone]');
      });

      test('designates when exit is closed', () => {
        const exit = buildExit([rooms.ExitFlag.DOOR, rooms.ExitFlag.CLOSED]);
        expect(exit.lookAt(npc)).toEqual('  - <y>     [north]<n> :: destination name');
      });
    });
  });

  describe('Room', () => {
    describe('constructor', () => {
      test('initializes room based on definition', () => {
        const definition: rooms.IRoomDefinition = {
          key: 'testKey',
          roomName: 'Test Room',
          description: 'Test description',
          exits: [],
          flags: [rooms.RoomFlag.NOMOB, rooms.RoomFlag.SENTINEL],
        };
        const room = new rooms.Room(definition, zone);
        expect(room.key).toEqual('testKey@testZone');
        expect(room.definition).toEqual(definition);
        expect(room.name).toEqual('Test Room');
        expect(room.styledName).toEqual('<g>Test Room<n>');
        expect(room.description).toEqual('Test description');
        expect(room.flags.flags).toEqual(rooms.RoomFlag.NOMOB | rooms.RoomFlag.SENTINEL);
      });

      test('adds room to zone', () => {
        const definition: rooms.IRoomDefinition = {
          key: 'testKey',
          roomName: 'Test Room',
          description: 'Test description',
          exits: [],
        };
        const room = new rooms.Room(definition, zone);
        expect(room.zone).toEqual(zone);
        expect(zone.rooms['testKey@testZone']).toEqual(room);
      });

      test('starts with empty exits and characters', () => {
        const definition: rooms.IRoomDefinition = {
          key: 'testKey',
          roomName: 'Test Room',
          description: 'Test description',
          exits: [
            { direction: 'north', destination: 'otherRoom1@testZone' },
            { direction: 'south', destination: 'otherRoom2@testZone' },
          ],
          resets: {
            characters: [{ key: 'testChar@testZone' }],
          },
        };
        const room = new rooms.Room(definition, zone);
        expect(room.exits).toEqual({});
        expect(room.characters).toEqual([]);
      });

      test('initializes commandHandler if definition has commands', () => {
        const commandDefinition = { name: 'roomCommand', handler: jest.fn() };
        const definition: rooms.IRoomDefinition = {
          key: 'testKey',
          roomName: 'Test Room',
          description: 'Test description',
          exits: [],
          commands: [commandDefinition],
        };
        const room = new rooms.Room(definition, zone);
        expect(room.commandHandler?.getCommandDefinitions()).toEqual([commandDefinition]);
      });
    });

    describe('finalize', () => {
      test('converts exit definitions to real definitions', () => {
        const otherRoom1 = buildRoom(zone, 'otherRoom1');
        const otherRoom2 = buildRoom(zone, 'otherRoom2');
        const room = buildRoom(zone, 'testKey', {
          exits: [
            { direction: 'north', destination: 'otherRoom1@testZone' },
            { direction: 'south', destination: 'otherRoom2@testZone' },
          ],
        });
        expect(room.exits).toEqual({});
        room.finalize();
        expect(Object.keys(room.exits).length).toEqual(2);
        expect(room.exits['north'].destination).toEqual(otherRoom1);
        expect(room.exits['south'].destination).toEqual(otherRoom2);
      });

      test('skips exits with unknown destination', () => {
        const otherRoom2 = buildRoom(zone, 'otherRoom2');
        const room = buildRoom(zone, 'testKey', {
          exits: [
            { direction: 'north', destination: 'otherRoom1@testZone' },
            { direction: 'south', destination: 'otherRoom2@testZone' },
          ],
        });
        expect(room.exits).toEqual({});
        room.finalize();
        expect(Object.keys(room.exits).length).toEqual(1);
        expect(room.exits['south'].destination).toEqual(otherRoom2);
      });

      test('adds any characters from saved room', () => {
        const charDef: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test character',
          roomDescription: 'Test character room description',
          description: 'Test character look description',
        };
        Instance.gameServer?.catalog.registerCharacterDefinition(charDef, zone);
        const room = buildRoom(zone, 'testKey');
        expect(room.characters).toEqual([]);
        room.finalize({
          key: 'testKey',
          roomName: '',
          description: '',
          exits: [],
          characters: [{ key: 'testChar@testZone', name: 'Test character' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        expect(room.characters[0].key).toEqual('testChar@testZone');
        expect(room.characters[0].name).toEqual('Test character');
        expect(room.characters[0].styledName).toEqual('<c>Test character<n>');
        expect(room.characters[0].roomDescription).toEqual('Test character room description');
        expect(room.characters[0].description).toEqual('Test character look description');
      });

      test('gives preference to saved character definition over registered definition', () => {
        const charDef: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test character',
          roomDescription: 'Test character room description',
          description: 'Test character look description',
        };
        Instance.gameServer?.catalog.registerCharacterDefinition(charDef, zone);
        const room = buildRoom(zone, 'testKey');
        expect(room.characters).toEqual([]);
        room.finalize({
          key: 'testKey',
          roomName: '',
          description: '',
          exits: [],
          characters: [{ key: 'testChar@testZone', name: 'Saved character', roomDescription: 'Saved room description', description: 'Saved look description' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        expect(room.characters[0].key).toEqual('testChar@testZone');
        expect(room.characters[0].name).toEqual('Saved character');
        expect(room.characters[0].styledName).toEqual('<c>Saved character<n>');
        expect(room.characters[0].roomDescription).toEqual('Saved room description');
        expect(room.characters[0].description).toEqual('Saved look description');
      });

      test('initializes command handler for saved character', () => {
        const handler = jest.fn().mockReturnValue(true);
        const commandDef: ICommandDefinition = { name: 'testcommand', handler };
        const charDef: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test character',
          commands: [commandDef],
        };
        Instance.gameServer?.catalog.registerCharacterDefinition(charDef, zone);
        const room = buildRoom(zone, 'testKey');
        expect(room.characters).toEqual([]);
        room.finalize({
          key: 'testKey',
          roomName: '',
          description: '',
          exits: [],
          characters: [{ key: 'testChar@testZone', name: 'Test character' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        expect(room.characters[0].commandHandler).toBeDefined();
        expect(room.characters[0].commandHandler?.getCommandDefinitions().length).toEqual(1);
        expect(room.characters[0].commandHandler?.getCommandDefinitions()[0].name).toEqual('testcommand');
        const invoker = buildCharacter(zone, 'invoker', room);
        expect(room.characters[0].commandHandler?.handleCommand(invoker, 'testcommand', undefined)).toBeTruthy();
        expect(handler).toBeCalled();
      });

      test('adds any items from saved room', () => {
        const itemDef: IItemDefinition = {
          key: 'testItem',
          name: 'Test item',
          roomDescription: 'Test item room description',
          description: 'Test item look description',
        };
        Instance.gameServer?.catalog.registerItemDefinition(itemDef, zone);
        const room = buildRoom(zone, 'testKey');
        expect(room.items).toEqual([]);
        room.finalize({
          key: 'testKey',
          roomName: '',
          description: '',
          exits: [],
          characters: [],
          items: [{ key: 'testItem@testZone', name: 'Test item' }],
        });
        expect(room.items.length).toEqual(1);
        expect(room.items[0].key).toEqual('testItem@testZone');
        expect(room.items[0].name).toEqual('Test item');
        expect(room.items[0].styledName).toEqual('<y>Test item<n>');
        expect(room.items[0].roomDescription).toEqual('Test item room description');
        expect(room.items[0].description).toEqual('Test item look description');
      });

      test('gives preference to saved item definition over registered definition', () => {
        const itemDef: IItemDefinition = {
          key: 'testItem',
          name: 'Test item',
          roomDescription: 'Test item room description',
          description: 'Test item look description',
        };
        Instance.gameServer?.catalog.registerItemDefinition(itemDef, zone);
        const room = buildRoom(zone, 'testKey');
        expect(room.characters).toEqual([]);
        room.finalize({
          key: 'testKey',
          roomName: '',
          description: '',
          exits: [],
          characters: [],
          items: [{ key: 'testItem@testZone', name: 'Saved item', roomDescription: 'Saved room description', description: 'Saved look description' }],
        });
        expect(room.items.length).toEqual(1);
        expect(room.items[0].key).toEqual('testItem@testZone');
        expect(room.items[0].name).toEqual('Saved item');
        expect(room.items[0].styledName).toEqual('<y>Saved item<n>');
        expect(room.items[0].roomDescription).toEqual('Saved room description');
        expect(room.items[0].description).toEqual('Saved look description');
      });
    });

    describe('canEnter', () => {
      test(`everyone can enter normal rooms`, () => {
        const room = buildRoom(zone, 'testKey', { flags: [] });
        expect(room.canEnter(player)).toBeTruthy();
        expect(room.canEnter(npc)).toBeTruthy();
      });

      test(`npcs can't enter NOMOB rooms`, () => {
        const room = buildRoom(zone, 'testKey', { flags: [rooms.RoomFlag.NOMOB] });
        expect(room.canEnter(player)).toBeTruthy();
        expect(room.canEnter(npc)).toBeFalsy();
      });
    });

    describe('canWanderInto', () => {
      test('everyone can wander into normal rooms', () => {
        const room = buildRoom(zone, 'testKey');
        expect(room.canWanderInto(player)).toBeTruthy();
        expect(room.canWanderInto(npc)).toBeTruthy();
      });

      test(`npcs can't wander into sentinel rooms`, () => {
        const room = buildRoom(zone, 'testKey', { flags: [rooms.RoomFlag.SENTINEL] });
        expect(room.canWanderInto(player)).toBeTruthy();
        expect(room.canWanderInto(npc)).toBeFalsy();
      });

      test(`npcs can't wander into nomob rooms`, () => {
        const room = buildRoom(zone, 'testKey', { flags: [rooms.RoomFlag.NOMOB] });
        expect(room.canWanderInto(player)).toBeTruthy();
        expect(room.canWanderInto(npc)).toBeFalsy();
      });
    });

    describe('lookAt', () => {
      test('shows room name and description', () => {
        const room = buildRoom(zone, 'testKey');
        const output = room.lookAt(npc);
        expect(output).toContain(room.styledName);
        expect(output).toContain(room.description);
      });

      test('shows room key for admin users', () => {
        const room = buildRoom(zone, 'testKey');
        expect(room.lookAt(npc)).not.toContain('[testKey@testZone]');
        npc.admin = true;
        expect(room.lookAt(npc)).toContain('[testKey@testZone]');
      });

      test('shows visible exits', () => {
        const room = buildRoom(zone, 'testKey', {
          exits: [
            { direction: 'north', destination: 'origin' },
            { direction: 'south', destination: 'origin', flags: [rooms.ExitFlag.CLOSED] },
            { direction: 'west', destination: 'origin', flags: [rooms.ExitFlag.SECRET] },
          ],
        });
        room.finalize();
        const output = room.lookAt(npc);
        expect(output).toContain('north<n> :: origin name');
        expect(output).toContain('[south]<n> :: origin name');
        expect(output).not.toContain('west');
      });

      test('shows exit keys for admin users', () => {
        const room = buildRoom(zone, 'testKey', {
          exits: [{ direction: 'north', destination: 'origin' }],
        });
        room.finalize();
        expect(room.lookAt(npc)).not.toContain('[origin@testZone]');
        npc.admin = true;
        expect(room.lookAt(npc)).toContain('north<n> :: origin name [origin@testZone]');
      });

      test('shows other characters in room', () => {
        const room = buildRoom(zone, 'testKey');
        room.finalize();
        const char1 = buildCharacter(zone, 'otherChar1', room, { roomDescription: 'Char 1 in the room.' });
        const char2 = buildCharacter(zone, 'otherChar2', room, { roomDescription: 'Char 2 in the room.' });
        const char3 = buildCharacter(zone, 'otherChar3', room, { roomDescription: 'Char 3 in the room.' });
        const output = room.lookAt(char2);
        expect(output).toContain('\nChar 1 in the room. Char 3 in the room.');
        expect(output).not.toContain('Char 2 in the room.');
      });

      test('merges multiple of same character into one description', () => {
        const room = buildRoom(zone, 'testKey');
        room.finalize();
        const char1 = buildCharacter(zone, 'otherChar1', room, { roomDescription: 'Char 1 in the room.' });
        const char2 = buildCharacter(zone, 'otherChar2', room, { roomDescription: 'Char 2 in the room.' });
        const char12 = buildCharacter(zone, 'otherChar1', room, { roomDescription: 'Char 1 in the room.' });
        const char3 = buildCharacter(zone, 'otherChar3', room, { roomDescription: 'Char 3 in the room.' });
        const output = room.lookAt(char2);
        expect(output).toContain('\n(x2) Char 1 in the room. Char 3 in the room.');
      });

      test('shows items in room', () => {
        const room = buildRoom(zone, 'testKey');
        room.finalize();
        const item1 = buildItem(zone, 'item1', { roomDescription: 'Item 1 in the room.' });
        const item2 = buildItem(zone, 'item2', { roomDescription: 'Item 2 in the room.' });
        room.addItem(item1);
        room.addItem(item2);
        const output = room.lookAt(npc);
        expect(output).toContain('\nItem 1 in the room. Item 2 in the room.');
      });

      test('merges multiple of same item into one description', () => {
        const room = buildRoom(zone, 'testKey');
        room.finalize();
        const item1 = buildItem(zone, 'item1', { roomDescription: 'Item 1 in the room.' });
        const item2 = buildItem(zone, 'item2', { roomDescription: 'Item 2 in the room.' });
        const item12 = buildItem(zone, 'item1', { roomDescription: 'Item 1 in the room.' });
        room.addItem(item1);
        room.addItem(item2);
        room.addItem(item12);
        const output = room.lookAt(npc);
        expect(output).toContain('\n(x2) Item 1 in the room. Item 2 in the room.');
      });

      test('only merges items if same modifications on both items', () => {
        const room = buildRoom(zone, 'testKey');
        room.finalize();
        const item1 = buildItem(zone, 'item1', { roomDescription: '{color} Item 1 in the room.', modifications: { color: 'red' } });
        const item12 = buildItem(zone, 'item1', { roomDescription: '{color} Item 1 in the room.', modifications: { color: 'blue' } });
        const item13 = buildItem(zone, 'item1', { roomDescription: '{color} Item 1 in the room.', modifications: { color: 'red' } });
        room.addItem(item1);
        room.addItem(item12);
        room.addItem(item13);
        const output = room.lookAt(npc);
        expect(output).toContain('\n(x2) red Item 1 in the room. blue Item 1 in the room.');
      });
    });

    describe('addCharacter', () => {
      test('adds character to room and zone', () => {
        const newZone = buildZone({ key: 'otherZone' }, true);
        const room = buildRoom(newZone, 'testKey');
        room.finalize();
        expect(npc.room).not.toEqual(room);
        expect(newZone.characters).toEqual([]);
        expect(room.characters).toEqual([]);

        room.addCharacter(npc);

        expect(npc.room).toEqual(room);
        expect(newZone.characters).toEqual([npc]);
        expect(room.characters).toEqual([npc]);
      });

      test(`removes character from previous zone or room`, () => {
        const newZone = buildZone({ key: 'otherZone' }, true);
        const room = buildRoom(newZone, 'testKey');
        room.finalize();
        expect(npc.room).toEqual(origin);
        expect(zone.characters).toContain(npc);
        expect(origin.characters).toContain(npc);

        room.addCharacter(npc);

        expect(zone.characters).not.toContain(npc);
        expect(origin.characters).not.toContain(npc);
      });
    });

    describe('removeCharacter', () => {
      test(`removes character from room and zone but doesn't change character's room`, () => {
        expect(npc.room).toEqual(origin);
        expect(zone.characters).toContain(npc);
        expect(origin.characters).toContain(npc);

        origin.removeCharacter(npc);

        expect(npc.room).toEqual(origin);
        expect(zone.characters).not.toContain(npc);
        expect(origin.characters).not.toContain(npc);
      });
    });

    describe('emitTo', () => {
      test('emits message to all characters in room', () => {
        const room = buildRoom(zone, 'testKey');
        const char1 = { emitTo: jest.fn() } as any;
        const char2 = { emitTo: jest.fn() } as any;
        const char3 = { emitTo: jest.fn() } as any;
        room.characters = [char1, char2, char3];
        room.emitTo(`Test message`);
        expect(char1.emitTo).toBeCalledWith(`Test message`);
        expect(char2.emitTo).toBeCalledWith(`Test message`);
        expect(char3.emitTo).toBeCalledWith(`Test message`);
      });

      test(`supports excluding characters`, () => {
        const room = buildRoom(zone, 'testKey');
        const char1 = { emitTo: jest.fn() } as any;
        const char2 = { emitTo: jest.fn() } as any;
        const char3 = { emitTo: jest.fn() } as any;
        room.characters = [char1, char2, char3];
        room.emitTo(`Test message`, [char1, char3]);
        expect(char1.emitTo).not.toBeCalled();
        expect(char2.emitTo).toBeCalledWith(`Test message`);
        expect(char3.emitTo).not.toBeCalled();
      });
    });

    describe('reset', () => {
      test('adds characters from reset definition', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar2', name: 'Test char 2' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1' }, { key: 'testChar2' }] } });
        room.finalize();
        expect(room.characters.length).toEqual(0);
        room.reset();
        expect(room.characters.length).toEqual(2);
        expect(room.characters.map(({ key }) => key)).toEqual(['testChar1@testZone', 'testChar2@testZone']);
      });

      test('skips character if already in room', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1' }] } });
        room.finalize();
        room.reset();
        expect(room.characters.length).toEqual(1);
        expect(room.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
        const id = room.characters[0].id;
        room.reset();
        expect(room.characters.length).toEqual(1);
        expect(room.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
        expect(room.characters[0].id).toEqual(id);
      });

      // TODO: Multiple resets for a single monster aren't joined together to make sure the total amount is there
      test('skips character if already in different room in zone', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room1 = buildRoom(zone, 'testKey1', { resets: { characters: [{ key: 'testChar1' }] } });
        room1.finalize();
        const room2 = buildRoom(zone, 'testKey2', { resets: { characters: [{ key: 'testChar1' }] } });
        room2.finalize();
        room1.reset();
        expect(room1.characters.length).toEqual(1);
        expect(room1.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
        room2.reset();
        expect(room2.characters.length).toEqual(0);
      });

      test('adds character even if in zone if dontCheckWholeZone is set', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room1 = buildRoom(zone, 'testKey1', { resets: { characters: [{ key: 'testChar1', dontCheckWholeZone: true }] } });
        room1.finalize();
        const room2 = buildRoom(zone, 'testKey2', { resets: { characters: [{ key: 'testChar1', dontCheckWholeZone: true }] } });
        room2.finalize();
        room1.reset();
        expect(room1.characters.length).toEqual(1);
        expect(room1.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
        room2.reset();
        expect(room2.characters.length).toEqual(1);
        expect(room1.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
      });

      test('adds time based reset if the time matches', () => {
        const timeOfDay = calculateTime().timeOfDay;
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1', times: [timeOfDay] }] } });
        room.finalize();
        expect(room.characters.length).toEqual(0);
        room.reset();
        expect(room.characters.length).toEqual(1);
        expect(room.characters.map(({ key }) => key)).toEqual(['testChar1@testZone']);
      });

      test('skips time based reset if the time mismatch', () => {
        const timeOfDay = calculateTime().timeOfDay === TimeOfDay.AFTERNOON ? TimeOfDay.MORNING : TimeOfDay.AFTERNOON;
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1', times: [timeOfDay] }] } });
        room.finalize();
        expect(room.characters.length).toEqual(0);
        room.reset();
        expect(room.characters.length).toEqual(0);
      });

      test('emits creation message on character add if defined', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1', creationMessage: 'Test char 1 added' }] } });
        jest.spyOn(room, 'emitTo');
        room.finalize();
        expect(room.characters.length).toEqual(0);
        room.reset();
        expect(room.characters.length).toEqual(1);
        expect(room.emitTo).toBeCalledWith('Test char 1 added');
      });

      // TODO: Probably need a way to clean up characters, but at the moment resets are the only way to add characters
      // to a room (outside of @cload) so they shouldn't grow beyond desired amounts (unless dontCheckWholeZone set on
      // a roaming monster, so don't do that)
      test(`characters not normally removed if not part of reset`, () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [] } });
        room.finalize({
          key: 'testKey',
          roomName: 'testKey name',
          description: '',
          exits: [],
          characters: [{ key: 'testChar1@testZone', name: 'Test char 1' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        room.reset();
        expect(room.characters.length).toEqual(1);
      });

      test('character removed if part of a time based reset and its not that time', () => {
        const timeOfDay = calculateTime().timeOfDay === TimeOfDay.AFTERNOON ? TimeOfDay.MORNING : TimeOfDay.AFTERNOON;
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { characters: [{ key: 'testChar1', times: [timeOfDay] }] } });
        room.finalize({
          key: 'testKey',
          roomName: 'testKey name',
          description: '',
          exits: [],
          characters: [{ key: 'testChar1@testZone', name: 'Test char 1' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        room.reset();
        expect(room.characters.length).toEqual(0);
      });

      test('emits destruction message on removal if defined', () => {
        const timeOfDay = calculateTime().timeOfDay === TimeOfDay.AFTERNOON ? TimeOfDay.MORNING : TimeOfDay.AFTERNOON;
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        const room = buildRoom(zone, 'testKey', {
          resets: { characters: [{ key: 'testChar1', times: [timeOfDay], destructionMessage: 'Test char 1 removed' }] },
        });
        jest.spyOn(room, 'emitTo');
        room.finalize({
          key: 'testKey',
          roomName: 'testKey name',
          description: '',
          exits: [],
          characters: [{ key: 'testChar1@testZone', name: 'Test char 1' }],
          items: [],
        });
        expect(room.characters.length).toEqual(1);
        room.reset();
        expect(room.characters.length).toEqual(0);
        expect(room.emitTo).toBeCalledWith('Test char 1 removed');
      });

      test('adds items from reset definition', () => {
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item 1' }, zone);
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'testItem2', name: 'Test item 2' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { items: [{ key: 'testItem1' }, { key: 'testItem2' }] } });
        room.finalize();
        expect(room.items.length).toEqual(0);
        room.reset();
        expect(room.items.length).toEqual(2);
        expect(room.items.map(({ key }) => key)).toEqual(['testItem1@testZone', 'testItem2@testZone']);
      });

      test('skips item if already in room', () => {
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item 1' }, zone);
        const room = buildRoom(zone, 'testKey', { resets: { items: [{ key: 'testItem1' }] } });
        room.finalize();
        room.reset();
        expect(room.items.length).toEqual(1);
        expect(room.items.map(({ key }) => key)).toEqual(['testItem1@testZone']);
        const id = room.items[0].id;
        room.reset();
        expect(room.items.length).toEqual(1);
        expect(room.items.map(({ key }) => key)).toEqual(['testItem1@testZone']);
        expect(room.items[0].id).toEqual(id);
      });
    });

    describe('tick', () => {
      test('calls tick on definition if defined', () => {
        const tick = jest.fn();
        const room = buildRoom(zone, 'testKey', { tick });
        room.tick(27);
        expect(tick).toBeCalledWith(room, 27);
      });
    });

    describe('toJson', () => {
      test('converts room to saveable definition', () => {
        Instance.gameServer?.catalog.registerCharacterDefinition({ key: 'testChar1', name: 'Test char 1' }, zone);
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item 1' }, zone);
        const room = buildRoom(zone, 'testKey', { exits: [{ direction: 'north', destination: 'origin' }] });
        room.finalize({
          key: 'testKey',
          roomName: 'testKey name',
          description: '',
          exits: [],
          characters: [{ key: 'testChar1@testZone', name: 'Test char 1' }],
          items: [{ key: 'testItem1@testZone', name: 'Test item 1' }],
        });
        const output = room.toJson();
        expect(output).toEqual({
          key: 'testKey@testZone',
          roomName: 'testKey name',
          description: 'testKey description',
          exits: [{ direction: 'north', destination: 'origin@testZone', flags: 0 }],
          characters: [
            {
              key: 'testChar1@testZone',
              name: 'Test char 1',
              commands: undefined,
              inventory: [],
              workingData: {},
            },
          ],
          items: [
            {
              key: 'testItem1@testZone',
              name: 'Test item 1',
              modifications: {},
              workingData: {},
              keywords: [],
              description: 'You see <y>Test item 1<n>.',
              roomDescription: '<y>Test item 1<n> is on the ground here.',
            },
          ],
        });
      });
    });

    describe('toString', () => {
      test('returns styled name', () => {
        const room = buildRoom(zone, 'testKey', { roomName: 'Test room' });
        expect(room.toString()).toEqual('<g>Test room<n>');
      });
    });
  });
});
