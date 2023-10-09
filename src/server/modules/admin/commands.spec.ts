import { Instance, getCatalogSafely, getGameServerSafely } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildPlayer, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from '@core/entities/character';
import { registerCommands } from './commands';

describe('admin/commands', () => {
  let invoker: Character;
  let other: Character;
  let nonAdmin: Character;

  beforeEach(() => {
    initializeTestServer();

    const zone = buildZone({}, true);
    const room = buildRoom(zone, 'testRoom');
    const otherRoom = buildRoom(zone, 'otherRoom');
    invoker = buildPlayer('invoker', room, { admin: true });
    other = buildCharacter(zone, 'other', room);
    nonAdmin = buildCharacter(zone, 'nonAdmin', otherRoom);
    registerCommands();
  });

  const callCommand = (invoker: Character, rawInput: string) => {
    // Check every call with a non-admin user
    expect(getGameServerSafely().commandHandler.handleCommand(nonAdmin, rawInput, undefined)).toBeFalsy();
    getGameServerSafely().commandHandler.handleCommand(invoker, rawInput, undefined);
  };

  describe('@force', () => {
    test('forces another character to do something', () => {
      callCommand(invoker, '@force other do something');
      expect(invoker.emitTo).toBeCalledWith(`You force <c>other name<n> to "do something"`);
      expect(other.emitTo).toBeCalledWith(`<Y>invokername<n> forces you to "do something"`);
      expect(other.sendCommand).toBeCalledWith(`do something`);
    });

    test('sends message to invoker if no params', () => {
      callCommand(invoker, '@force');
      expect(invoker.emitTo).toBeCalledWith(`Force who to do what?`);
    });

    test('sends message to invoker if character not in room', () => {
      callCommand(invoker, '@force notHere do something');
      expect(invoker.emitTo).toBeCalledWith('Force who to do what?');
    });
  });

  describe('@zlist', () => {
    test('lists all registered zones', () => {
      callCommand(invoker, '@zlist');
      expect(invoker.emitTo).toBeCalledWith(`<G>Zones
<B>------------------------------<n>
[testZone] <R>Test zone<n>`);
    });
  });

  describe('@zclear', () => {
    test('clears all npcs from the zone', () => {
      expect(invoker.room.zone.characters).toEqual([invoker, other, nonAdmin]);
      expect(invoker.room.characters).toEqual([invoker, other]);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
      callCommand(invoker, '@zclear');
      expect(invoker.emitTo).toBeCalledWith(`You clap your hands and the zone empties.`);
      expect(invoker.room.zone.characters).toEqual([invoker]);
      expect(invoker.room.characters).toEqual([invoker]);
      expect(nonAdmin.room.characters).toEqual([]);
    });

    test('clears all items from the zone', () => {
      const item1 = buildItem(invoker.zone, 'testItem1');
      invoker.room.addItem(item1);
      const item2 = buildItem(invoker.zone, 'testItem2');
      nonAdmin.room.addItem(item2);
      expect(invoker.room.items).toEqual([item1]);
      expect(nonAdmin.room.items).toEqual([item2]);
      callCommand(invoker, '@zclear');
      expect(invoker.room.items).toEqual([]);
      expect(nonAdmin.room.items).toEqual([]);
    });

    test('ends any npc conversatios', () => {
      const conversationChar = buildCharacter(invoker.room.zone, 'convo', invoker.room);
      const conversation = { endConversation: jest.fn() } as any;
      conversationChar.conversation = conversation;
      expect(invoker.room.characters).toContain(conversationChar);
      callCommand(invoker, '@zclear');
      expect(invoker.room.characters).not.toContain(conversationChar);
      expect(conversation.endConversation).toBeCalled();
    });

    test(`sends a message to other players`, () => {
      const otherPlayer = buildPlayer('player2', invoker.room);
      expect(invoker.room.characters).toContain(otherPlayer);
      callCommand(invoker, '@zclear');
      expect(invoker.room.characters).toContain(otherPlayer);
      expect(otherPlayer.emitTo).toBeCalledWith(`You hear a defening thunderclap and everything around you disappears.`);
    });
  });

  describe('@zreset', () => {
    test('clears and resets all npcs in the zone', () => {
      expect(invoker.room.zone.characters).toEqual([invoker, other, nonAdmin]);
      expect(invoker.room.characters).toEqual([invoker, other]);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
      getCatalogSafely().registerCharacterDefinition({ key: 'resetChar', name: 'Reset char' }, invoker.zone);
      invoker.room.definition.resets = { characters: [{ key: 'resetChar@testZone' }] };
      callCommand(invoker, '@zreset');
      expect(invoker.emitTo).toBeCalledWith(`You clap your hands and the zone returns to normal.`);
      expect(invoker.room.zone.characters.map(({ key }) => key)).toEqual(['invoker', 'resetChar@testZone']);
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'resetChar@testZone']);
      expect(nonAdmin.room.characters).toEqual([]);
    });

    test('clears and resets all items in the zone', () => {
      const item1 = buildItem(invoker.zone, 'testItem1');
      invoker.room.addItem(item1);
      const item2 = buildItem(invoker.zone, 'testItem2');
      nonAdmin.room.addItem(item2);
      expect(invoker.room.items).toEqual([item1]);
      expect(nonAdmin.room.items).toEqual([item2]);
      getCatalogSafely().registerItemDefinition({ key: 'resetItem', name: 'Reset item' }, invoker.zone);
      invoker.room.definition.resets = { items: [{ key: 'resetItem@testZone' }] };
      callCommand(invoker, '@zreset');
      expect(invoker.room.items.map(({ key }) => key)).toEqual(['resetItem@testZone']);
      expect(nonAdmin.room.items).toEqual([]);
    });

    test('ends any npc conversatios', () => {
      const conversationChar = buildCharacter(invoker.room.zone, 'convo', invoker.room);
      const conversation = { endConversation: jest.fn() } as any;
      conversationChar.conversation = conversation;
      expect(invoker.room.characters).toContain(conversationChar);
      callCommand(invoker, '@zreset');
      expect(invoker.room.characters).not.toContain(conversationChar);
      expect(conversation.endConversation).toBeCalled();
    });

    test(`sends a message to other players`, () => {
      const otherPlayer = buildPlayer('player2', invoker.room);
      expect(invoker.room.characters).toContain(otherPlayer);
      callCommand(invoker, '@zreset');
      expect(invoker.room.characters).toContain(otherPlayer);
      expect(otherPlayer.emitTo).toBeCalledWith(`You hear a defening thunderclap and everything around you returns to normal.`);
    });
  });

  describe('@rlist', () => {
    test('lists rooms in the zone', () => {
      callCommand(invoker, '@rlist');
      expect(invoker.emitTo).toBeCalledWith(`<G>Rooms for <R>Test zone<n>
<B>------------------------------<n>
[otherRoom@testZone] <y>otherRoom name<n>
[testRoom@testZone] <y>testRoom name<n>`);
    });

    test('lists rooms for zone if key provided', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      buildRoom(otherZone, 'newRoom1');
      buildRoom(otherZone, 'newRoom2');
      callCommand(invoker, '@rlist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Rooms for <R>Other zone<n>
<B>------------------------------<n>
[newRoom1@otherZone] <y>newRoom1 name<n>
[newRoom2@otherZone] <y>newRoom2 name<n>`);
    });

    test('shows none if no rooms defined for zone', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      callCommand(invoker, '@rlist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Rooms for <R>Other zone<n>
<B>------------------------------<n>
None`);
    });
  });

  describe('@rclear', () => {
    test('clears all npcs from the zone', () => {
      expect(invoker.room.zone.characters).toEqual([invoker, other, nonAdmin]);
      expect(invoker.room.characters).toEqual([invoker, other]);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
      callCommand(invoker, '@rclear');
      expect(invoker.emitTo).toBeCalledWith(`You clap your hands and the room empties.`);
      expect(invoker.room.zone.characters).toEqual([invoker, nonAdmin]);
      expect(invoker.room.characters).toEqual([invoker]);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
    });

    test('clears all items from the zone', () => {
      const item1 = buildItem(invoker.zone, 'testItem1');
      invoker.room.addItem(item1);
      const item2 = buildItem(invoker.zone, 'testItem2');
      nonAdmin.room.addItem(item2);
      expect(invoker.room.items).toEqual([item1]);
      expect(nonAdmin.room.items).toEqual([item2]);
      callCommand(invoker, '@rclear');
      expect(invoker.room.items).toEqual([]);
      expect(nonAdmin.room.items).toEqual([item2]);
    });

    test('ends any npc conversatios', () => {
      const conversationChar = buildCharacter(invoker.room.zone, 'convo', invoker.room);
      const conversation = { endConversation: jest.fn() } as any;
      conversationChar.conversation = conversation;
      expect(invoker.room.characters).toContain(conversationChar);
      callCommand(invoker, '@rclear');
      expect(invoker.room.characters).not.toContain(conversationChar);
      expect(conversation.endConversation).toBeCalled();
    });

    test(`sends a message to other players`, () => {
      const otherPlayer = buildPlayer('player2', invoker.room);
      expect(invoker.room.characters).toContain(otherPlayer);
      callCommand(invoker, '@rclear');
      expect(invoker.room.characters).toContain(otherPlayer);
      expect(otherPlayer.emitTo).toBeCalledWith(`You hear a thunderclap and the room empties.`);
    });
  });

  describe('@rreset', () => {
    test('clears and resets all npcs in the zone', () => {
      expect(invoker.room.zone.characters).toEqual([invoker, other, nonAdmin]);
      expect(invoker.room.characters).toEqual([invoker, other]);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
      getCatalogSafely().registerCharacterDefinition({ key: 'resetChar', name: 'Reset char' }, invoker.zone);
      invoker.room.definition.resets = { characters: [{ key: 'resetChar@testZone' }] };
      callCommand(invoker, '@rreset');
      expect(invoker.emitTo).toBeCalledWith(`You clap your hands and the room returns to normal.`);
      expect(invoker.room.zone.characters.map(({ key }) => key)).toEqual(['invoker', 'nonAdmin', 'resetChar@testZone']);
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'resetChar@testZone']);
      expect(nonAdmin.room.characters).toEqual([nonAdmin]);
    });

    test('clears and resets all items in the zone', () => {
      const item1 = buildItem(invoker.zone, 'testItem1');
      invoker.room.addItem(item1);
      const item2 = buildItem(invoker.zone, 'testItem2');
      nonAdmin.room.addItem(item2);
      expect(invoker.room.items).toEqual([item1]);
      expect(nonAdmin.room.items).toEqual([item2]);
      getCatalogSafely().registerItemDefinition({ key: 'resetItem', name: 'Reset item' }, invoker.zone);
      invoker.room.definition.resets = { items: [{ key: 'resetItem@testZone' }] };
      callCommand(invoker, '@rreset');
      expect(invoker.room.items.map(({ key }) => key)).toEqual(['resetItem@testZone']);
      expect(nonAdmin.room.items).toEqual([item2]);
    });

    test('ends any npc conversatios', () => {
      const conversationChar = buildCharacter(invoker.room.zone, 'convo', invoker.room);
      const conversation = { endConversation: jest.fn() } as any;
      conversationChar.conversation = conversation;
      expect(invoker.room.characters).toContain(conversationChar);
      callCommand(invoker, '@rreset');
      expect(invoker.room.characters).not.toContain(conversationChar);
      expect(conversation.endConversation).toBeCalled();
    });

    test(`sends a message to other players`, () => {
      const otherPlayer = buildPlayer('player2', invoker.room);
      expect(invoker.room.characters).toContain(otherPlayer);
      callCommand(invoker, '@rreset');
      expect(invoker.room.characters).toContain(otherPlayer);
      expect(otherPlayer.emitTo).toBeCalledWith(`You hear a thunderclap and the room returns to normal.`);
    });
  });

  describe('@rgoto', () => {
    test('moves invoker to room', () => {
      expect(invoker.room).toEqual(other.room);
      callCommand(invoker, '@rgoto otherRoom@testZone');
      expect(invoker.room).toEqual(nonAdmin.room);
      expect(invoker.emitTo).toBeCalledWith(`You teleport through space in a cloud of smoke...`);
      expect(other.emitTo).toBeCalledWith(`<Y>invokername<n> disappears in a cloud of smoke...`);
      expect(nonAdmin.emitTo).toBeCalledWith(`<Y>invokername<n> appears in a cloud of smoke...`);
      expect(invoker.sendCommand).toBeCalledWith('look');
    });

    test('shows message to invoker if no params', () => {
      callCommand(invoker, '@rgoto');
      expect(invoker.emitTo).toBeCalledWith(`Go where?`);
    });

    test('shows message to invoker if not found', () => {
      callCommand(invoker, '@rgoto nonRoom@testZone');
      expect(invoker.emitTo).toBeCalledWith(`Unknown room.`);
    });
  });

  describe('@clist', () => {
    test('lists characters registered to the zone', () => {
      getCatalogSafely().registerCharacterDefinition({ key: 'char1', name: 'Char 1' }, invoker.zone);
      getCatalogSafely().registerCharacterDefinition({ key: 'char2', name: 'Char 2' }, invoker.zone);
      callCommand(invoker, '@clist');
      expect(invoker.emitTo).toBeCalledWith(`<G>Characters for <R>Test zone<n>
<B>------------------------------<n>
[char1@testZone] <y>Char 1<n>
[char2@testZone] <y>Char 2<n>`);
    });

    test('lists characters for other zone if key provided', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      getCatalogSafely().registerCharacterDefinition({ key: 'char1', name: 'Char 1' }, otherZone);
      getCatalogSafely().registerCharacterDefinition({ key: 'char2', name: 'Char 2' }, otherZone);
      callCommand(invoker, '@clist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Characters for <R>Other zone<n>
<B>------------------------------<n>
[char1@otherZone] <y>Char 1<n>
[char2@otherZone] <y>Char 2<n>`);
    });

    test('shows none if no characters in zone', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      callCommand(invoker, '@clist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Characters for <R>Other zone<n>
<B>------------------------------<n>
None`);
    });
  });

  describe('@cload', () => {
    test('loads character into current room', () => {
      getCatalogSafely().registerCharacterDefinition({ key: 'char1', name: 'Char 1' }, invoker.zone);
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'other']);
      callCommand(invoker, '@cload char1');
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'other', 'char1@testZone']);
      expect(invoker.emitTo).toBeCalledWith(`<c>Char 1<n> appears in a cloud of smoke...`);
      expect(other.emitTo).toBeCalledWith(`<c>Char 1<n> appears in a cloud of smoke...`);
    });

    test('shows message if unknown character', () => {
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'other']);
      callCommand(invoker, '@cload char1');
      expect(invoker.room.characters.map(({ key }) => key)).toEqual(['invoker', 'other']);
      expect(invoker.emitTo).toBeCalledWith(`Unknown character: char1`);
    });

    test('shows message if no params', () => {
      callCommand(invoker, '@cload');
      expect(invoker.emitTo).toBeCalledWith(`Load which character?`);
    });
  });

  describe('@cwhere', () => {
    test('shows invoker location of character', () => {
      callCommand(invoker, '@cwhere nonAdmin');
      expect(invoker.emitTo).toBeCalledWith(`<c>nonAdmin name<n> [nonAdmin] at [otherRoom@testZone] <g>otherRoom name<n>`);
    });

    test('shows message if character not found', () => {
      callCommand(invoker, '@cwhere nonChar');
      expect(invoker.emitTo).toBeCalledWith(`Character not found: nonChar`);
    });
  });

  describe('@cgoto', () => {
    test('moves invoker to character', () => {
      expect(invoker.room).toEqual(other.room);
      callCommand(invoker, '@cgoto nonAdmin');
      expect(invoker.room).toEqual(nonAdmin.room);
      expect(invoker.emitTo).toBeCalledWith(`You teleport through space in a cloud of smoke...`);
      expect(other.emitTo).toBeCalledWith(`<Y>invokername<n> disappears in a cloud of smoke...`);
      expect(nonAdmin.emitTo).toBeCalledWith(`<Y>invokername<n> appears in a cloud of smoke...`);
      expect(invoker.sendCommand).toBeCalledWith('look');
    });

    test('shows message to invoker if not found', () => {
      callCommand(invoker, '@cgoto nonChar@testZone');
      expect(invoker.emitTo).toBeCalledWith(`Character not found: nonChar@testZone`);
    });
  });

  describe('@ilist', () => {
    test('lists items in zone', () => {
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: 'Item 1', description: 'Item 1 description' }, invoker.zone);
      getCatalogSafely().registerItemDefinition({ key: 'item2', name: 'Item 2', description: 'Item 2 description' }, invoker.zone);
      callCommand(invoker, '@ilist');
      expect(invoker.emitTo).toBeCalledWith(`<G>Items for <R>Test zone<n>
<B>------------------------------<n>
[item1@testZone] <y>Item 1
<D>Item 1 description<n>

[item2@testZone] <y>Item 2
<D>Item 2 description<n>`);
    });

    test('lists items for zone by key', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: 'Item 1', description: 'Item 1 description' }, otherZone);
      getCatalogSafely().registerItemDefinition({ key: 'item2', name: 'Item 2', description: 'Item 2 description' }, otherZone);
      callCommand(invoker, '@ilist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Items for <R>Other zone<n>
<B>------------------------------<n>
[item1@otherZone] <y>Item 1
<D>Item 1 description<n>

[item2@otherZone] <y>Item 2
<D>Item 2 description<n>`);
    });

    test('shows none if no items in zone', () => {
      const otherZone = buildZone({ key: 'otherZone', zoneName: 'Other zone' }, true);
      callCommand(invoker, '@ilist otherZone');
      expect(invoker.emitTo).toBeCalledWith(`<G>Items for <R>Other zone<n>
<B>------------------------------<n>
None`);
    });
  });

  describe('@iload', () => {
    test('loads item into inventory', () => {
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: 'Item 1', description: 'Item 1 description' }, invoker.zone);
      callCommand(invoker, '@iload item1@testZone');
      expect(invoker.items.map(({ name }) => name)).toEqual(['Item 1']);
      expect(invoker.emitTo).toBeCalledWith(`<y>Item 1<n> loaded to your inventory.`);
    });

    test('supports applying modifications', () => {
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: '{size} item that is {color}', description: 'Item 1 description' }, invoker.zone);
      callCommand(invoker, '@iload item1@testZone size=large color=red');
      expect(invoker.items.map(({ name }) => name)).toEqual(['large item that is red']);
    });

    test('shows message if no params', () => {
      callCommand(invoker, '@iload');
      expect(invoker.emitTo).toBeCalledWith(`Load which item?`);
    });

    test('shows message if invalid syntax', () => {
      callCommand(invoker, '@iload item1@testZone large red');
      expect(invoker.emitTo).toBeCalledWith(`Invalid syntax: @iload {key} | {modification=value} {modification=value}`);
    });

    test('shows message if unknown item', () => {
      callCommand(invoker, '@iload item1@testZone');
      expect(invoker.emitTo).toBeCalledWith(`Unknown item: item1@testZone`);
    });
  });
});
