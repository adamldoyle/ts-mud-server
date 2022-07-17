import { Exit, ExitFlag, Room } from '@core/entities/room';
import { Zone } from '@core/entities/zone';
import { Character, IPlayerDefinition } from '@core/entities/character';
import { parseArguments } from './parseArguments';
import { Instance } from '@server/GameServerInstance';
import { createCatalog } from '../entities/catalog';
import { buildZone, buildRoom, buildCharacter, buildItem, buildExit } from '../entities/testUtils';

jest.mock('@server/GameServer');

describe('parseArguments', () => {
  let zone: Zone;
  let invokerRoom: Room;
  let otherRoom: Room;
  let invoker: Character;
  let npc: Character;
  beforeEach(() => {
    Instance.gameServer = {
      catalog: createCatalog(),
    } as any;
    zone = buildZone();
    Instance.gameServer?.catalog.registerZone(zone);
    invokerRoom = buildRoom(zone, 'testRoom1');
    otherRoom = buildRoom(zone, 'testRoom2');
    invoker = buildCharacter(zone, 'invoker', invokerRoom, { accountId: 'invokerAccount' } as IPlayerDefinition);
    npc = buildCharacter(zone, 'npc', invokerRoom);
  });

  describe('character matching', () => {
    test('allows looking at character in room', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', otherRoom);
      let response = parseArguments(invoker, ['otherUser1'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['otherUser2'], 'char.room');
      expect(response).toBeUndefined();
    });

    test('allows restricting looking at self', () => {
      let response = parseArguments(invoker, ['invoker'], 'char.room.noself');
      expect(response).toBeUndefined();
      response = parseArguments(invoker, ['invoker'], 'char.room');
      expect(response?.[0].key).toEqual('invoker');
    });

    test('allows matching on character key with case insensitive matching', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      let response = parseArguments(invoker, ['otherUser1'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['OTHERUSER1'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character key partial with case insensitive matching', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      let response = parseArguments(invoker, ['otherUse'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['OTHERUSE'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character keywords with case insensitive matching', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom, { keywords: ['other-keyword'] });
      let response = parseArguments(invoker, ['other-keyword'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['OTHER-KEYWORD'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character name with case insensitive matching', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom, { name: 'nameOfCharacter' });
      let response = parseArguments(invoker, ['nameOfChar'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['NAMEOFCHAR'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('matching prefers full key to keywords', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom, { keywords: ['otherUser2'] });
      buildCharacter(zone, 'otherUser2', invokerRoom);
      let response = parseArguments(invoker, ['otherUser2'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser2');
    });

    test('matching prefers keywords to partial key', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', invokerRoom, { keywords: ['otherUser'] });
      let response = parseArguments(invoker, ['otherUser'], 'char.room');
      expect(response?.[0].key).toEqual('otherUser2');
    });

    test('matching prefers partial key to partial name', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom, { name: 'userKey' });
      buildCharacter(zone, 'userKey2', invokerRoom);
      let response = parseArguments(invoker, ['userKey'], 'char.room');
      expect(response?.[0].key).toEqual('userKey2');
    });

    test('restricts to room by default', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', otherRoom);
      let response = parseArguments(invoker, ['otherUser1'], 'char');
      expect(response?.[0].key).toEqual('otherUser1');
      response = parseArguments(invoker, ['otherUser2'], 'char');
      expect(response).toBeUndefined();
    });

    test('allows searching whole zone', () => {
      buildCharacter(zone, 'otherUser2', otherRoom);
      const response = parseArguments(invoker, ['otherUser2'], 'char.zone');
      expect(response?.[0].key).toEqual('otherUser2');
    });

    test('allows restricting to npcs', () => {
      buildCharacter(zone, 'npcChar', invokerRoom);
      buildCharacter(zone, 'playerChar', invokerRoom, { accountId: 'playerAccount' } as IPlayerDefinition);
      let response = parseArguments(invoker, ['npcChar'], 'char.npc');
      expect(response?.[0].key).toEqual('npcChar');
      response = parseArguments(invoker, ['playerChar'], 'char.npc');
      expect(response).toBeUndefined();
    });

    test('allows restricting to players', () => {
      buildCharacter(zone, 'npcChar', invokerRoom);
      buildCharacter(zone, 'playerChar', invokerRoom, { accountId: 'playerAccount' } as IPlayerDefinition);
      let response = parseArguments(invoker, ['npcChar'], 'char.player');
      expect(response).toBeUndefined();
      response = parseArguments(invoker, ['playerChar'], 'char.player');
      expect(response?.[0].key).toEqual('playerChar');
    });
  });

  describe('item matching', () => {
    test("allows looking at invoker's inventory", () => {
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', {});
      invoker.addItem(item1);
      invokerRoom.addItem(item2);
      let response = parseArguments(invoker, ['testItem1'], 'item.inv');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['testItem2'], 'item.inv');
      expect(response).toBeUndefined();
    });

    test("allows looking at invoker's room", () => {
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', {});
      invoker.addItem(item1);
      invokerRoom.addItem(item2);
      let response = parseArguments(invoker, ['testItem1'], 'item.room');
      expect(response).toBeUndefined();
      response = parseArguments(invoker, ['testItem2'], 'item.room');
      expect(response?.[0]).toEqual(item2);
    });

    test('looks at inventory and room combined by default', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', {});
      invoker.addItem(item1);
      invokerRoom.addItem(item2);
      let response = parseArguments(invoker, ['testItem1'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['testItem2'], 'item');
      expect(response?.[0]).toEqual(item2);
    });

    test('allows matching on item key with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      invoker.addItem(item1);
      let response = parseArguments(invoker, ['testItem1'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['TESTITEM1'], 'item');
      expect(response?.[0]).toEqual(item1);
    });

    test('allows matching on item key partial with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      invoker.addItem(item1);
      let response = parseArguments(invoker, ['testIt'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['TESTIT'], 'item');
      expect(response?.[0]).toEqual(item1);
    });

    test('allows matching on full item keywords with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', { keywords: ['other-keyword'] });
      invoker.addItem(item1);
      let response = parseArguments(invoker, ['other-keyword'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['OTHER-KEYWORD'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['other-key'], 'item');
      expect(response).toBeUndefined();
    });

    test('allows matching on partial item name with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', { name: 'other-name' });
      invoker.addItem(item1);
      let response = parseArguments(invoker, ['other-na'], 'item');
      expect(response?.[0]).toEqual(item1);
      response = parseArguments(invoker, ['OTHER-NA'], 'item');
      expect(response?.[0]).toEqual(item1);
    });

    test('matching prefers full key to keywords', () => {
      const item1 = buildItem(zone, 'testItem1', { keywords: ['testItem2'] });
      const item2 = buildItem(zone, 'testItem2', {});
      invoker.addItem(item1);
      invoker.addItem(item2);
      let response = parseArguments(invoker, ['testItem2'], 'item');
      expect(response?.[0]).toEqual(item2);
    });

    test('matching prefers keywords to partial key', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', { keywords: ['testItem'] });
      invoker.addItem(item1);
      invoker.addItem(item2);
      let response = parseArguments(invoker, ['testItem'], 'item');
      expect(response?.[0]).toEqual(item2);
    });

    test('matching prefers partial key to partial name', () => {
      const item1 = buildItem(zone, 'testItem1', { name: 'itemKey' });
      const item2 = buildItem(zone, 'itemKey2', {});
      invoker.addItem(item1);
      invoker.addItem(item2);
      let response = parseArguments(invoker, ['itemKey'], 'item');
      expect(response?.[0]).toEqual(item2);
    });
  });

  describe('exit matching', () => {
    const validateExit = (exit: Exit, syntax: string, invokerVisible: boolean, npcVisible: boolean) => {
      let response = parseArguments(invoker, [exit.direction], syntax);
      invokerVisible ? expect(response).toEqual([exit]) : expect(response).toBeUndefined();
      response = parseArguments(npc, [exit.direction], syntax);
      npcVisible ? expect(response).toEqual([exit]) : expect(response).toBeUndefined();
    };

    test('matches on direction with case insensitive matching', () => {
      const exit = buildExit(invokerRoom, otherRoom, 'north', {});
      const response = parseArguments(invoker, ['NORTH'], 'exit');
      expect(response).toEqual([exit]);
    });

    test('matches on direction with case insensitive matching', () => {
      const exit = buildExit(invokerRoom, otherRoom, 'north', {});
      const response = parseArguments(invoker, ['N'], 'exit');
      expect(response).toEqual([exit]);
    });

    test('allows restricting to visible', () => {
      const openExit = buildExit(invokerRoom, otherRoom, 'north', {});
      const secretExit = buildExit(invokerRoom, otherRoom, 'south', { flags: [ExitFlag.SECRET] });
      validateExit(openExit, 'exit.visible', true, true);
      validateExit(secretExit, 'exit.visible', false, false);
    });

    test('allows restricting to passable', () => {
      const openExit = buildExit(invokerRoom, otherRoom, 'north', {});
      const closedExit = buildExit(invokerRoom, otherRoom, 'south', { flags: [ExitFlag.CLOSED] });
      const noMobExit = buildExit(invokerRoom, otherRoom, 'west', { flags: [ExitFlag.NOMOB] });
      validateExit(openExit, 'exit.passable', true, true);
      validateExit(closedExit, 'exit.passable', false, false);
      validateExit(noMobExit, 'exit.passable', true, false);
    });

    test('allows restricting to peekable', () => {
      const openExit = buildExit(invokerRoom, otherRoom, 'north', {});
      const secretExit = buildExit(invokerRoom, otherRoom, 'south', { flags: [ExitFlag.SECRET] });
      const closedExit = buildExit(invokerRoom, otherRoom, 'west', { flags: [ExitFlag.CLOSED] });
      validateExit(openExit, 'exit.peekable', true, true);
      validateExit(secretExit, 'exit.peekable', false, false);
      validateExit(closedExit, 'exit.peekable', false, false);
    });

    test('allows restricting to closeable', () => {
      const nonDoor = buildExit(invokerRoom, otherRoom, 'north', {});
      const openDoor = buildExit(invokerRoom, otherRoom, 'south', { flags: [ExitFlag.DOOR] });
      const openNoMobDoor = buildExit(invokerRoom, otherRoom, 'east', { flags: [ExitFlag.DOOR, ExitFlag.NOMOB] });
      const closedDoor = buildExit(invokerRoom, otherRoom, 'west', { flags: [ExitFlag.DOOR, ExitFlag.CLOSED] });
      validateExit(nonDoor, 'exit.closeable', false, false);
      validateExit(openDoor, 'exit.closeable', true, true);
      validateExit(openNoMobDoor, 'exit.closeable', true, false);
      validateExit(closedDoor, 'exit.closeable', false, false);
    });

    test('allows restricting to openable', () => {
      const nonDoor = buildExit(invokerRoom, otherRoom, 'north', {});
      const closedDoor = buildExit(invokerRoom, otherRoom, 'south', { flags: [ExitFlag.DOOR, ExitFlag.CLOSED] });
      const closedNoMobDoor = buildExit(invokerRoom, otherRoom, 'east', { flags: [ExitFlag.DOOR, ExitFlag.CLOSED, ExitFlag.NOMOB] });
      const openDoor = buildExit(invokerRoom, otherRoom, 'west', { flags: [ExitFlag.DOOR] });
      validateExit(nonDoor, 'exit.openable', false, false);
      validateExit(closedDoor, 'exit.openable', true, true);
      validateExit(closedNoMobDoor, 'exit.openable', true, false);
      validateExit(openDoor, 'exit.openable', false, false);
    });
  });

  describe('zone matching', () => {
    test('matches a zone by key', () => {
      const response = parseArguments(invoker, ['testZone'], 'zone');
      expect(response).toEqual([zone]);
    });
  });

  describe('word matching', () => {
    test('matches a single word', () => {
      const response = parseArguments(invoker, ['testing'], 'word');
      expect(response).toEqual(['testing']);
    });

    test('returns undefined if no word', () => {
      const response = parseArguments(invoker, [], 'word');
      expect(response).toBeUndefined();
    });
  });

  describe('string matching', () => {
    test('matches the entire string', () => {
      const response = parseArguments(invoker, ['testing1', 'testing2', 'testing3'], 'string');
      expect(response).toEqual(['testing1 testing2 testing3']);
    });

    test('returns undefined if no string', () => {
      const response = parseArguments(invoker, [], 'string');
      expect(response).toBeUndefined();
    });
  });

  describe('general matching', () => {
    test('matches optional strings', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      let response = parseArguments(invoker, ['at', 'otherUser1'], '[at] char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('can skip optional strings', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      let response = parseArguments(invoker, ['otherUser1'], '[at] char.room');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('fails if optional string is a mismatch', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      let response = parseArguments(invoker, ['to', 'otherUser1'], '[at] char.room');
      expect(response).toBeUndefined();
    });

    test('supports declaring remainder optional', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', invokerRoom);
      let response = parseArguments(invoker, ['otherUser1'], 'char.room | char.room');
      expect(response?.length).toEqual(1);
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('supports declaring remainder optional', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', invokerRoom);
      let response = parseArguments(invoker, ['otherUser1', 'otherUser2'], 'char.room | char.room');
      expect(response?.length).toEqual(2);
      expect(response?.[0].key).toEqual('otherUser1');
      expect(response?.[1].key).toEqual('otherUser2');
    });

    test('matches multiple parts', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', invokerRoom);
      const response = parseArguments(invoker, ['at', 'otherUser1', 'and', 'otherUser2'], '[at] char.room [and] char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      expect(response?.[1].key).toEqual('otherUser2');
    });

    test('matches multiple parts with optionals missing', () => {
      buildCharacter(zone, 'otherUser1', invokerRoom);
      buildCharacter(zone, 'otherUser2', invokerRoom);
      const response = parseArguments(invoker, ['otherUser1', 'otherUser2'], '[at] char.room [and] char.room');
      expect(response?.[0].key).toEqual('otherUser1');
      expect(response?.[1].key).toEqual('otherUser2');
    });
  });

  describe('complex matching', () => {
    test('matches as expected', () => {
      const user1 = buildCharacter(zone, 'otherUser1', invokerRoom);
      const user2 = buildCharacter(zone, 'otherUser2', invokerRoom);
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', {});
      invokerRoom.addItem(item1);
      invoker.addItem(item2);
      const response = parseArguments(
        invoker,
        'testItem to otherUser1 and testItem otherUser2 and then dance'.split(' '),
        'item.inv [to] char.room.noself [and] item.room [to] char.room.noself string'
      );
      expect(response).toEqual([item2, user1, item1, user2, 'and then dance']);
    });
  });
});
