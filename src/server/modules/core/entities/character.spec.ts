import fs from 'fs';
import { Instance } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildPlayer, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character, CharacterFlag, ICharacterDefinition, IPlayerDefinition, matchCharacters, Player } from './character';
import { Room, RoomFlag } from './room';
import { Zone } from './zone';
import { RaceType } from './race';
import { ClassType } from './class';
import { defaultAbilities } from './abilities';

jest.mock('fs');

describe('core/entities/character', () => {
  let zone: Zone;
  let origin: Room;
  beforeEach(() => {
    initializeTestServer();
    zone = buildZone({}, true);
    origin = buildRoom(zone, 'origin');
  });

  describe('Character', () => {
    describe('constructor', () => {
      test('initializes character largely based on definition', () => {
        const handler = jest.fn();
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          admin: true,
          roomDescription: 'Test char room description',
          description: 'Test char look description',
          race: RaceType.ELF,
          class: ClassType.DRUID,
          abilities: {
            STRENGTH: { baseValue: 10, modifiers: {}, value: 10 },
          },
          keywords: ['keyword1', 'KEYWORD2'],
          workingData: {
            key1: 'value1',
            key2: 'value2',
          },
          flags: [CharacterFlag.PACIFISM],
          commands: [{ name: 'testcommand', handler }],
        };
        const char = new Character(definition, zone, origin);
        expect(char.definition).toEqual(definition);
        expect(char.id.length).toBeGreaterThan(0);
        expect(char.key).toEqual('testChar');
        expect(char.name).toEqual('Test char');
        expect(char.admin).toBeTruthy();
        expect(char.npc).toBeTruthy();
        expect(char.styledName).toEqual('<Y>Test char<n>');
        expect(char.roomDescription).toEqual('Test char room description');
        expect(char.description).toEqual('Test char look description');
        expect(char.race.type).toEqual(RaceType.ELF);
        expect(char.class.type).toEqual(ClassType.DRUID);
        expect(char.abilities).toEqual({ ...defaultAbilities(), STRENGTH: { baseValue: 10, modifiers: {}, value: 10 } });
        expect(char.keywords).toEqual(['keyword1', 'keyword2']);
        expect(char.following).toBeUndefined();
        expect(char.followers).toEqual([]);
        expect(char.conversation).toBeUndefined();
        expect(char.workingData).toEqual({ key1: 'value1', key2: 'value2' });
        expect(char.flags.flags).toEqual(CharacterFlag.PACIFISM);
        expect(char.commandHandler?.getCommandDefinitions().length).toEqual(1);
      });

      test('initializes character with reasonable defaults', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
        };
        const char = new Character(definition, zone, origin);
        expect(char.definition).toEqual(definition);
        expect(char.id.length).toBeGreaterThan(0);
        expect(char.key).toEqual('testChar');
        expect(char.name).toEqual('Test char');
        expect(char.admin).toBeFalsy();
        expect(char.npc).toBeTruthy();
        expect(char.styledName).toEqual('<c>Test char<n>');
        expect(char.roomDescription).toEqual('<c>Test char<n> is here.');
        expect(char.description).toEqual('You see <c>Test char<n>.');
        expect(char.race.type).toEqual(RaceType.HUMANOID);
        expect(char.class.type).toEqual(ClassType.NONE);
        expect(char.abilities).toEqual(defaultAbilities());
        expect(char.keywords).toEqual([]);
        expect(char.following).toBeUndefined();
        expect(char.followers).toEqual([]);
        expect(char.conversation).toBeUndefined();
        expect(char.workingData).toEqual({});
        expect(char.flags.flags).toEqual(0);
        expect(char.commandHandler).toBeUndefined();
      });

      test('adds character to room', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
        };
        const char = new Character(definition, zone, origin);
        expect(char.room).toEqual(origin);
        expect(char.zone).toEqual(zone);
        expect(origin.characters).toEqual([char]);
        expect(zone.characters).toEqual([char]);
      });
    });

    describe('finalize', () => {
      test('adds items to inventory based on definition', () => {
        Instance.gameServer?.catalog.registerItemDefinition(
          {
            key: 'testItem',
            name: 'Test item',
            roomDescription: 'Test item room description',
            description: 'Test item look description',
          },
          zone
        );
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          inventory: [{ key: 'testItem' }],
        };
        const char = new Character(definition, zone, origin);
        expect(char.items.length).toEqual(0);
        char.finalize();
        expect(char.items.length).toEqual(1);
        expect(char.items[0].key).toEqual('testItem@testZone');
      });
    });

    describe('changeDescription', () => {
      test('changes description only on actual character if not permanent', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Original room description',
          description: 'Original look description',
        };
        const char = new Character(definition, zone, origin);
        expect(char.roomDescription).toEqual('Original room description');
        expect(char.description).toEqual('Original look description');
        expect(char.definition.roomDescription).toEqual('Original room description');
        expect(char.definition.description).toEqual('Original look description');
        char.changeDescription({ room: 'New room description', look: 'New look description' }, false);
        expect(char.roomDescription).toEqual('New room description');
        expect(char.description).toEqual('New look description');
        expect(char.definition.roomDescription).toEqual('Original room description');
        expect(char.definition.description).toEqual('Original look description');
      });

      test('changes description on definition as well if permanent', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Original room description',
          description: 'Original look description',
        };
        const char = new Character(definition, zone, origin);
        expect(char.roomDescription).toEqual('Original room description');
        expect(char.description).toEqual('Original look description');
        expect(char.definition.roomDescription).toEqual('Original room description');
        expect(char.definition.description).toEqual('Original look description');
        char.changeDescription({ room: 'New room description', look: 'New look description' }, true);
        expect(char.roomDescription).toEqual('New room description');
        expect(char.description).toEqual('New look description');
        expect(char.definition.roomDescription).toEqual('New room description');
        expect(char.definition.description).toEqual('New look description');
      });
    });

    describe('lookAt', () => {
      let invoker: Character;
      beforeEach(() => {
        invoker = buildCharacter(zone, 'invoker', origin);
      });

      test('shows user name and description', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Char room description',
          description: 'Char look description',
        };
        const char = new Character(definition, zone, origin);
        const output = char.lookAt(invoker);
        expect(output).toEqual(`<c>Test char<n>\nChar look description\n\nInventory:\n  nothing`);
      });

      test('shows inventory', () => {
        Instance.gameServer?.catalog.registerItemDefinition(
          {
            key: 'testItem',
            name: 'Test item',
            roomDescription: 'Test item room description',
            description: 'Test item look description',
          },
          zone
        );
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Char room description',
          description: 'Char look description',
          inventory: [{ key: 'testItem' }],
        };
        const char = new Character(definition, zone, origin);
        expect(char.items.length).toEqual(0);
        char.finalize();
        const output = char.lookAt(invoker);
        expect(output).toEqual(`<c>Test char<n>\nChar look description\n\nInventory:\n  <y>Test item<n>`);
      });

      test('shows character key if looker is admin', () => {
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Char room description',
          description: 'Char look description',
        };
        const char = new Character(definition, zone, origin);
        invoker.admin = true;
        const output = char.lookAt(invoker);
        expect(output).toEqual(`<c>Test char<n> [testChar]\nChar look description\n\nInventory:\n  nothing`);
      });
    });

    describe('roomLookAt', () => {
      test('shows room description', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const definition: ICharacterDefinition = {
          key: 'testChar',
          name: 'Test char',
          roomDescription: 'Char room description',
          description: 'Char look description',
        };
        const char = new Character(definition, zone, origin);
        const output = char.roomLookAt(invoker);
        expect(output).toEqual(`Char room description`);
      });
    });

    describe('follow', () => {
      test('starts following target and adds to their followers', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const target = buildCharacter(zone, 'target', origin);
        expect(invoker.following).toBeUndefined();
        expect(invoker.followers).toEqual([]);
        expect(target.following).toBeUndefined();
        expect(target.followers).toEqual([]);
        invoker.follow(target);
        expect(invoker.following).toEqual(target);
        expect(invoker.followers).toEqual([]);
        expect(target.following).toBeUndefined();
        expect(target.followers).toEqual([invoker]);
      });

      test('emits message to target and invoker', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const target = buildCharacter(zone, 'target', origin);
        jest.spyOn(invoker, 'emitTo');
        jest.spyOn(target, 'emitTo');
        invoker.follow(target);
        expect(invoker.emitTo).toBeCalledWith('You are now following <c>target name<n>.');
        expect(target.emitTo).toBeCalledWith('<c>invoker name<n> is now following you.');
      });
    });

    describe('unfollow', () => {
      test('stops following whoever invoker is following', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const target = buildCharacter(zone, 'target', origin);
        invoker.follow(target);
        expect(invoker.following).toEqual(target);
        expect(invoker.followers).toEqual([]);
        expect(target.following).toBeUndefined();
        expect(target.followers).toEqual([invoker]);
        invoker.unfollow();
        expect(invoker.following).toBeUndefined();
        expect(invoker.followers).toEqual([]);
        expect(target.following).toBeUndefined();
        expect(target.followers).toEqual([]);
      });

      test('emits message to target and invoker', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const target = buildCharacter(zone, 'target', origin);
        jest.spyOn(invoker, 'emitTo');
        jest.spyOn(target, 'emitTo');
        invoker.follow(target);
        invoker.unfollow();
        expect(invoker.emitTo).toBeCalledWith('You are no longer following <c>target name<n>.');
        expect(target.emitTo).toBeCalledWith('<c>invoker name<n> is no longer following you.');
      });

      test('does nothing if not following anyone', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        jest.spyOn(invoker, 'emitTo');
        invoker.unfollow();
        expect(invoker.emitTo).not.toBeCalled();
      });
    });

    describe('disband', () => {
      test('removes all followers', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const follower1 = buildCharacter(zone, 'follower1', origin);
        const follower2 = buildCharacter(zone, 'follower2', origin);
        follower1.follow(invoker);
        follower2.follow(invoker);
        expect(invoker.followers).toEqual([follower1, follower2]);
        expect(follower1.following).toEqual(invoker);
        expect(follower2.following).toEqual(invoker);
        invoker.disband();
        expect(invoker.followers).toEqual([]);
        expect(follower1.following).toBeUndefined();
        expect(follower2.following).toBeUndefined();
      });

      test('emits unfollow message to everyone involved', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const follower1 = buildCharacter(zone, 'follower1', origin);
        const follower2 = buildCharacter(zone, 'follower2', origin);
        follower1.follow(invoker);
        follower2.follow(invoker);
        jest.spyOn(invoker, 'emitTo');
        jest.spyOn(follower1, 'emitTo');
        jest.spyOn(follower2, 'emitTo');
        invoker.disband();
        expect(follower1.emitTo).toBeCalledWith('You are no longer following <c>invoker name<n>.');
        expect(follower2.emitTo).toBeCalledWith('You are no longer following <c>invoker name<n>.');
        expect(invoker.emitTo).toBeCalledWith('<c>follower1 name<n> is no longer following you.');
        expect(invoker.emitTo).toBeCalledWith('<c>follower2 name<n> is no longer following you.');
      });
    });

    describe('balanced', () => {
      test('returns true if not unbalanced', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        expect(invoker.balanced()).toBeTruthy();
      });

      test('returns true if current time greater than unbalancedUntil value', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalancedUntil = 27;
        expect(invoker.balanced()).toBeTruthy();
      });

      test('returns false if current time less than unbalancedUntil value', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalancedUntil = Date.now() + 5000;
        expect(invoker.balanced()).toBeFalsy();
      });
    });

    describe('balancedIn', () => {
      test('returns undefined if balanced', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        expect(invoker.balanced()).toBeTruthy();
        expect(invoker.balancedIn()).toBeUndefined();
      });

      test('returns amount of seconds until balanced if unbalanced', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalancedUntil = Date.now() + 5400;
        expect(invoker.balancedIn()).toEqual(5);
      });
    });

    describe('unbalance', () => {
      test('unbalances character for amount of seconds passed', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalance(5);
        expect(invoker.balancedIn()).toEqual(5);
      });

      test('extends unbalance if unbalanced to lesser amount', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalance(2);
        expect(invoker.balancedIn()).toEqual(2);
        invoker.unbalance(5);
        expect(invoker.balancedIn()).toEqual(5);
      });

      test('does not change unbalanced amount if less than current', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.unbalance(5);
        expect(invoker.balancedIn()).toEqual(5);
        invoker.unbalance(2);
        expect(invoker.balancedIn()).toEqual(5);
      });
    });

    describe('canWander', () => {
      test(`non npcs can't wander`, () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.npc = false;
        expect(invoker.canWander()).toBeFalsy();
      });

      test(`normal npcs can wander`, () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        expect(invoker.canWander()).toBeTruthy();
      });

      test(`sentinel npcs can't wander`, () => {
        const invoker = buildCharacter(zone, 'invoker', origin, { flags: [CharacterFlag.SENTINEL] });
        expect(invoker.canWander()).toBeFalsy();
      });

      test(`npcs can't wander in sentinel rooms`, () => {
        origin.flags.addFlag(RoomFlag.SENTINEL);
        const invoker = buildCharacter(zone, 'invoker', origin);
        expect(invoker.canWander()).toBeFalsy();
      });
    });

    describe('tick', () => {
      beforeEach(() => {
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
      });

      afterEach(() => {
        jest.spyOn(Math, 'random').mockRestore();
      });

      test('calls tick on definition if set', () => {
        const tick = jest.fn().mockReturnValue(true);
        const invoker = buildCharacter(zone, 'invoker', origin, { tick });
        invoker.tick(27);
        expect(tick).toBeCalledWith(invoker, 27);
      });

      test('calls tick on conversation if set', () => {
        const conversation = { tick: jest.fn().mockReturnValue(true) };
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.conversation = conversation as any;
        invoker.tick(27);
        expect(conversation.tick).toBeCalledWith(invoker, 27);
      });

      test('prefers tick on definition to conversation', () => {
        const tick = jest.fn().mockReturnValue(true);
        const conversation = { tick: jest.fn().mockReturnValue(true) };
        const invoker = buildCharacter(zone, 'invoker', origin, { tick });
        invoker.conversation = conversation as any;
        invoker.tick(27);
        expect(tick).toBeCalledWith(invoker, 27);
        expect(conversation.tick).not.toBeCalled();
      });

      test('continues past definition tick if it returns false', () => {
        const tick = jest.fn().mockReturnValue(false);
        const conversation = { tick: jest.fn().mockReturnValue(true) };
        const invoker = buildCharacter(zone, 'invoker', origin, { tick });
        invoker.conversation = conversation as any;
        invoker.tick(27);
        expect(tick).toBeCalledWith(invoker, 27);
        expect(conversation.tick).toBeCalledWith(invoker, 27);
      });

      test('wanderable mobs have 5% chance to wander', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.04);
        buildRoom(zone, 'otherRoom');
        origin.definition.exits = [{ direction: 'north', destination: 'otherRoom' }];
        origin.finalize();
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.tick(0);
        expect(Instance.gameServer?.handleCommand).toBeCalledWith(invoker, 'move north');
      });

      test('prefers tick on definition to wandering', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.04);
        buildRoom(zone, 'otherRoom');
        origin.definition.exits = [{ direction: 'north', destination: 'otherRoom' }];
        origin.finalize();
        const tick = jest.fn().mockReturnValue(true);
        const invoker = buildCharacter(zone, 'invoker', origin, { tick });
        invoker.tick(27);
        expect(tick).toBeCalledWith(invoker, 27);
        expect(Instance.gameServer?.handleCommand).not.toBeCalled();
      });

      test(`character doesn't wander if involved in conversation`, () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.04);
        buildRoom(zone, 'otherRoom');
        origin.definition.exits = [{ direction: 'north', destination: 'otherRoom' }];
        origin.finalize();
        const invoker = buildCharacter(zone, 'invoker', origin);
        const conversation = { tick: jest.fn().mockReturnValue(false) };
        invoker.conversation = conversation as any;
        invoker.tick(27);
        expect(Instance.gameServer?.handleCommand).not.toBeCalled();
      });

      test(`character doesn't wander if following someone`, () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.04);
        buildRoom(zone, 'otherRoom');
        origin.definition.exits = [{ direction: 'north', destination: 'otherRoom' }];
        origin.finalize();
        const invoker = buildCharacter(zone, 'invoker', origin);
        const target = buildCharacter(zone, 'target', origin);
        invoker.follow(target);
        invoker.tick(27);
        expect(Instance.gameServer?.handleCommand).not.toBeCalled();
      });

      // Could use some more wander tests here
      test(`character doesn't wander if they can't wander`, () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.04);
        buildRoom(zone, 'otherRoom');
        origin.definition.exits = [{ direction: 'north', destination: 'otherRoom' }];
        origin.finalize();
        const invoker = buildCharacter(zone, 'invoker', origin, { flags: [CharacterFlag.SENTINEL] });
        invoker.tick(27);
        expect(Instance.gameServer?.handleCommand).not.toBeCalled();
      });
    });

    describe('toJson', () => {
      test('produces character definition based on live character', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        const item = buildItem(zone, 'testItem');
        invoker.addItem(item);
        invoker.workingData['testKey'] = 'testValue';
        const output = invoker.toJson();
        expect(output).toEqual({
          key: 'invoker',
          name: 'invoker name',
          inventory: [
            {
              key: 'testItem',
              name: 'testItem name',
              modifications: {},
              workingData: {},
              keywords: [],
              description: 'You see <y>testItem name<n>.',
              roomDescription: '<y>testItem name<n> is on the ground here.',
            },
          ],
          workingData: { testKey: 'testValue' },
        });
      });
    });

    describe('sendCommand', () => {
      test('sends command to game server for character', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        invoker.sendCommand(`command test string`);
        expect(Instance.gameServer?.handleCommand).toBeCalledWith(invoker, `command test string`);
      });
    });

    describe('toString', () => {
      test('returns styled name', () => {
        const invoker = buildCharacter(zone, 'invoker', origin);
        expect(invoker.toString()).toEqual(`<c>invoker name<n>`);
      });
    });
  });

  describe('Player', () => {
    describe('constructor', () => {
      test('initializes with extra data beyond character definition', () => {
        const definition: IPlayerDefinition = {
          accountId: 'testAccountId',
          room: 'origin@testZone',
          playerNumber: 27,
          key: 'testplayer',
          name: 'Testplayer',
          race: RaceType.GNOME,
          class: ClassType.CLERIC,
          abilities: defaultAbilities(),
        };
        const player = new Player(definition);
        expect(player.accountId).toEqual('testAccountId');
        expect(player.definition).toEqual(definition);
        expect(player.id.length).toBeGreaterThan(0);
        expect(player.key).toEqual('testplayer');
        expect(player.name).toEqual('Testplayer');
        expect(player.admin).toBeFalsy();
        expect(player.npc).toBeFalsy();
        expect(player.styledName).toEqual('<c>Testplayer<n>');
        expect(player.roomDescription).toEqual('<c>Testplayer<n> is here.');
        expect(player.description).toEqual('You see <c>Testplayer<n>.');
        expect(player.race.type).toEqual(RaceType.GNOME);
        expect(player.class.type).toEqual(ClassType.CLERIC);
        expect(player.abilities).toEqual(defaultAbilities());
        expect(player.keywords).toEqual([]);
        expect(player.following).toBeUndefined();
        expect(player.followers).toEqual([]);
        expect(player.conversation).toBeUndefined();
        expect(player.workingData).toEqual({});
        expect(player.flags.flags).toEqual(0);
        expect(player.commandHandler).toBeUndefined();
        expect(player.room).toEqual(origin);
        expect(player.zone).toEqual(origin.zone);
      });
    });

    describe('finalize', () => {
      test('adds items to inventory based on definition', () => {
        Instance.gameServer?.catalog.registerItemDefinition(
          {
            key: 'testItem',
            name: 'Test item',
            roomDescription: 'Test item room description',
            description: 'Test item look description',
          },
          zone
        );
        const definition: IPlayerDefinition = {
          accountId: 'testAccountId',
          room: 'origin@testZone',
          playerNumber: 27,
          key: 'testplayer',
          name: 'Testplayer',
          race: RaceType.GNOME,
          class: ClassType.CLERIC,
          abilities: defaultAbilities(),
          inventory: [{ key: 'testItem@testZone' }],
        };
        const player = new Player(definition);
        expect(player.items.length).toEqual(0);
        player.finalize();
        expect(player.items.length).toEqual(1);
        expect(player.items[0].key).toEqual('testItem@testZone');
      });

      test('shows message to user and room', () => {
        const definition: IPlayerDefinition = {
          accountId: 'testAccountId',
          room: 'origin@testZone',
          playerNumber: 27,
          key: 'testplayer',
          name: 'Testplayer',
          race: RaceType.GNOME,
          class: ClassType.CLERIC,
          abilities: defaultAbilities(),
        };
        const player = new Player(definition);
        jest.spyOn(player.room, 'emitTo');
        player.finalize();

        expect(Instance.gameServer?.sendMessageToCharacter).toBeCalledWith('Testplayer', `You appear in a cloud of smoke...\n`);
        expect(player.room.emitTo).toBeCalledWith(`<c>Testplayer<n> appears in a cloud of smoke...`, [player]);
      });

      test('messages can be suppressed', () => {
        const definition: IPlayerDefinition = {
          accountId: 'testAccountId',
          room: 'origin@testZone',
          playerNumber: 27,
          key: 'testplayer',
          name: 'Testplayer',
          race: RaceType.GNOME,
          class: ClassType.CLERIC,
          abilities: defaultAbilities(),
        };
        const player = new Player(definition);
        jest.spyOn(player.room, 'emitTo');
        player.finalize(true);

        expect(Instance.gameServer?.sendMessageToCharacter).not.toBeCalled();
        expect(player.room.emitTo).not.toBeCalled();
      });
    });

    describe('disconnect', () => {
      test('removes character from room', () => {
        const player = buildPlayer('player', origin);
        expect(origin.characters).toEqual([player]);
        player.disconnect();
        expect(origin.characters).toEqual([]);
      });

      test('shows message to room', () => {
        const player = buildPlayer('player', origin);
        jest.spyOn(player.room, 'emitTo');
        player.disconnect();
        expect(origin.emitTo).toBeCalledWith(`<c>playername<n> disappears in a cloud of smoke...`, [player]);
      });
    });

    describe('emitTo', () => {
      test('sends message to character via game server', () => {
        const player = buildPlayer('player', origin);
        player.emitTo('message to player');
        expect(Instance.gameServer?.sendMessageToCharacter).toBeCalledWith(player.name, 'message to player\n');
      });
    });

    describe('tick', () => {
      test('calls tick on conversation if it exists', () => {
        const player = buildPlayer('player', origin);
        const conversation = { tick: jest.fn().mockReturnValue(true) };
        player.conversation = conversation as any;
        player.tick(27);
        expect(conversation.tick).toBeCalledWith(player, 27);
      });

      test(`calls save if it hasn't happened within the save interval`, () => {
        const player = buildPlayer('player', origin);
        expect(player.lastSave).toEqual(-1);
        player.tick(27);
        expect(player.lastSave).not.toEqual(-1);
      });
    });

    describe('playerExists', () => {
      test('returns true if a player file exists', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        expect(Player.playerExists('playername')).toBeTruthy();
        expect(fs.existsSync).toBeCalledWith(`data/players/playername.json`);
      });

      test('returns false if a player file does not exist', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        expect(Player.playerExists('playername')).toBeFalsy();
        expect(fs.existsSync).toBeCalledWith(`data/players/playername.json`);
      });
    });

    describe('load', () => {
      test('returns undefined if no player file exists', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        expect(Player.load('playername')).toBeUndefined();
        expect(fs.existsSync).toBeCalledWith(`data/players/playername.json`);
      });

      test('returns player if player file exists', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(
          JSON.stringify({
            accountId: 'testAccountId',
            room: 'origin@testZone',
            playerNumber: 27,
            key: 'testplayer',
            name: 'Testplayer',
          })
        );
        expect(Player.load('playername')?.key).toEqual('testplayer');
        expect(fs.existsSync).toBeCalledWith(`data/players/playername.json`);
        expect(fs.readFileSync).toBeCalledWith(`data/players/playername.json`, 'utf-8');
      });
    });

    describe('save', () => {
      test('writes player output to file', () => {
        const player = buildPlayer('player', origin);
        expect(player.lastSave).toEqual(-1);
        player.save();
        // expect(player.lastSave).not.toEqual(-1);
        expect(fs.writeFileSync).toBeCalledWith(
          `data/players/playername.json`,
          JSON.stringify(
            {
              key: 'player',
              accountId: 'player',
              room: 'origin@testZone',
              playerNumber: 1,
              name: 'playername',
              race: RaceType.HUMANOID,
              class: ClassType.NONE,
              abilities: defaultAbilities(),
              inventory: [],
              workingData: {},
            },
            null,
            2
          ),
          { encoding: 'utf-8' }
        );
      });
    });
  });

  describe('matchCharacters', () => {
    test('allows matching on character key with case insensitive matching', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin);
      let response = matchCharacters([char1], 'otherUser1');
      expect(response?.[0].key).toEqual('otherUser1');
      response = matchCharacters([char1], 'OTHERUSER1');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character key partial with case insensitive matching', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin);
      let response = matchCharacters([char1], 'otherUse');
      expect(response?.[0].key).toEqual('otherUser1');
      response = matchCharacters([char1], 'OTHERUSE');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character keywords with case insensitive matching', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin, { keywords: ['other-keyword'] });
      let response = matchCharacters([char1], 'other-keyword');
      expect(response?.[0].key).toEqual('otherUser1');
      response = matchCharacters([char1], 'OTHER-KEYWORD');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('allows matching on character name with case insensitive matching', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin, { name: 'nameOfCharacter' });
      let response = matchCharacters([char1], 'nameOfChar');
      expect(response?.[0].key).toEqual('otherUser1');
      response = matchCharacters([char1], 'NAMEOFCHAR');
      expect(response?.[0].key).toEqual('otherUser1');
    });

    test('matching prefers full key to keywords', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin, { keywords: ['otherUser2'] });
      const char2 = buildCharacter(zone, 'otherUser2', origin);
      let response = matchCharacters([char1, char2], 'otherUser2');
      expect(response?.[0].key).toEqual('otherUser2');
    });

    test('matching prefers keywords to partial key', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin);
      const char2 = buildCharacter(zone, 'otherUser2', origin, { keywords: ['otherUser'] });
      let response = matchCharacters([char1, char2], 'otherUser');
      expect(response?.[0].key).toEqual('otherUser2');
    });

    test('matching prefers partial key to partial name', () => {
      const char1 = buildCharacter(zone, 'otherUser1', origin, { name: 'userKey' });
      const char2 = buildCharacter(zone, 'userKey2', origin);
      let response = matchCharacters([char1, char2], 'userKey');
      expect(response?.[0].key).toEqual('userKey2');
    });
  });
});
