import { Instance } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from '@core/entities/character';
import { registerCommands } from './commands';
import { Item } from '../core/entities/item';
import { ExitFlag, Room } from '../core/entities/room';

describe('exploration/commands', () => {
  let invoker: Character;
  let other1: Character;
  let other2: Character;
  let roomItem: Item;
  let invItem: Item;
  let room: Room;
  let otherRoom: Room;
  beforeEach(() => {
    initializeTestServer();

    const zone = buildZone({}, true);
    room = buildRoom(zone, 'testRoom', {
      exits: [
        { direction: 'north', destination: 'otherRoom' },
        { direction: 'west', destination: 'otherRoom', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
      ],
    });
    otherRoom = buildRoom(zone, 'otherRoom', {
      exits: [
        { direction: 'south', destination: 'testRoom' },
        { direction: 'east', destination: 'testRoom', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
      ],
    });
    room.finalize();
    otherRoom.finalize();
    invoker = buildCharacter(zone, 'invoker', room);
    other1 = buildCharacter(zone, 'other1', room);
    other2 = buildCharacter(zone, 'other2', otherRoom);
    roomItem = buildItem(zone, 'roomItem');
    room.addItem(roomItem);
    invItem = buildItem(zone, 'invItem');
    invoker.addItem(invItem);
    registerCommands();
  });

  const callCommand = (invoker: Character, rawInput: string) => {
    Instance.gameServer?.commandHandler.handleCommand(invoker, rawInput, undefined);
  };

  describe('look', () => {
    test('looks at room when no params', () => {
      callCommand(invoker, 'look');
      expect(invoker.emitTo).toBeCalledWith(`
<g>testRoom name<n>
<B>-------------
<n>testRoom description

<c>other1 name<n> is here.
<y>roomItem name<n> is on the ground here.

  - <y>       north<n> :: otherRoom name
  - <y>      [west]<n> :: otherRoom name`);
    });

    test('looks at character if param is character identifier', () => {
      callCommand(invoker, 'look other');
      expect(invoker.emitTo).toBeCalledWith(`<c>other1 name<n>
You see <c>other1 name<n>.

Equipment:
  nothing

Inventory:
  nothing`);
    });

    test('looks at exit if param is exit identifier', () => {
      callCommand(invoker, 'look north');
      expect(invoker.emitTo).toBeCalledWith(`You look that way...

<g>otherRoom name<n>
<B>--------------
<n>otherRoom description

<c>other2 name<n> is here.

  - <y>      [east]<n> :: testRoom name
  - <y>       south<n> :: testRoom name`);
    });

    test('looks at item in inventory if param is item identifier', () => {
      callCommand(invoker, 'look invItem');
      expect(invoker.emitTo).toBeCalledWith(`<y>invItem name<n>
You see <y>invItem name<n>.`);
    });

    test('looks at item in room if param is item identifier', () => {
      callCommand(invoker, 'look roomItem');
      expect(invoker.emitTo).toBeCalledWith(`<y>roomItem name<n>
You see <y>roomItem name<n>.`);
    });

    test('prompts user for clarification if looking at unknown thing', () => {
      callCommand(invoker, 'look bogusThing');
      expect(invoker.emitTo).toBeCalledWith(`What do you want to look at?`);
    });
  });

  describe('move', () => {
    test('moves character through exit', () => {
      callCommand(invoker, 'move north');
      expect(invoker.emitTo).toBeCalledWith(`You arrive at...`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> leaves north.`);
      expect(other2.emitTo).toBeCalledWith(`<c>invoker name<n> arrives from the south.`);
      expect(invoker.room).toEqual(otherRoom);
      expect(invoker.sendCommand).toBeCalledWith('look');
    });

    test('works without move command', () => {
      callCommand(invoker, 'north');
      expect(invoker.emitTo).toBeCalledWith(`You arrive at...`);
      expect(invoker.room).toEqual(otherRoom);
      expect(invoker.sendCommand).toBeCalledWith('look');
    });

    test('shows message to user if bad exit', () => {
      callCommand(invoker, 'move south');
      expect(invoker.emitTo).toBeCalledWith(`You don't see an exit in that direction.`);
      expect(invoker.room).toEqual(room);
    });

    test('shows message to user if blocked exit', () => {
      callCommand(invoker, 'move west');
      expect(invoker.emitTo).toBeCalledWith(`You are blocked from going that direction.`);
      expect(invoker.room).toEqual(room);
    });

    test('moves followers as well', () => {
      other1.follow(invoker);
      callCommand(invoker, 'north');
      expect(invoker.emitTo).toBeCalledWith(`You arrive at...`);
      expect(other1.emitTo).toBeCalledWith(`You follow <c>invoker name<n>...`);
      expect(other2.emitTo).toBeCalledWith(`<c>invoker name<n>'s party arrives from the south.`);
      expect(invoker.room).toEqual(otherRoom);
      expect(other1.room).toEqual(otherRoom);
      expect(invoker.sendCommand).toBeCalledWith('look');
    });
  });

  describe('follow', () => {
    test('requires a person to follow', () => {
      callCommand(invoker, 'follow');
      expect(invoker.emitTo).toBeCalledWith(`They're not here to follow.`);
    });

    test('makes the invoker follow the target', () => {
      callCommand(invoker, 'follow other');
      expect(invoker.emitTo).toBeCalledWith(`You are now following <c>other1 name<n>.`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> is now following you.`);
      expect(invoker.following).toEqual(other1);
      expect(other1.followers).toEqual([invoker]);
    });

    test('makes the invoker unfollow first', () => {
      const other3 = buildCharacter(invoker.zone, 'other3', invoker.room);
      invoker.following = other3;
      other3.followers = [invoker];
      callCommand(invoker, 'follow other');
      expect(invoker.emitTo).toBeCalledWith(`You are no longer following <c>other3 name<n>.`);
      expect(invoker.emitTo).toBeCalledWith(`You are now following <c>other1 name<n>.`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> is now following you.`);
      expect(other3.emitTo).toBeCalledWith(`<c>invoker name<n> is no longer following you.`);
      expect(invoker.following).toEqual(other1);
      expect(other1.followers).toEqual([invoker]);
      expect(other3.followers).toEqual([]);
    });
  });

  describe('unfollow', () => {
    test('does nothing if not following', () => {
      callCommand(invoker, 'unfollow');
      expect(invoker.emitTo).not.toBeCalled();
    });

    test('makes the invoker unfollow', () => {
      invoker.following = other1;
      other1.followers = [invoker];
      callCommand(invoker, 'unfollow');
      expect(invoker.emitTo).toBeCalledWith(`You are no longer following <c>other1 name<n>.`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> is no longer following you.`);
      expect(invoker.following).toBeUndefined();
      expect(other1.followers).toEqual([]);
    });
  });

  describe('disband', () => {
    test('does nothing if not being followed', () => {
      callCommand(invoker, 'disband');
      expect(invoker.emitTo).not.toBeCalled();
    });

    test('makes the invoker unfollow', () => {
      const other3 = buildCharacter(invoker.zone, 'other3', invoker.room);
      other1.following = invoker;
      other3.following = invoker;
      invoker.followers = [other1, other3];
      callCommand(invoker, 'disband');
      expect(other1.emitTo).toBeCalledWith(`You are no longer following <c>invoker name<n>.`);
      expect(other3.emitTo).toBeCalledWith(`You are no longer following <c>invoker name<n>.`);
      expect(invoker.emitTo).toBeCalledWith(`<c>other1 name<n> is no longer following you.`);
      expect(invoker.emitTo).toBeCalledWith(`<c>other3 name<n> is no longer following you.`);
      expect(other1.following).toBeUndefined();
      expect(other3.following).toBeUndefined();
      expect(invoker.followers).toEqual([]);
    });
  });

  describe('open', () => {
    test("opens a door if it's closed", () => {
      expect(invoker.room.exits['west'].isClosed()).toBeTruthy();
      callCommand(invoker, 'open west');
      expect(invoker.room.exits['west'].isClosed()).toBeFalsy();
      expect(invoker.emitTo).toBeCalledWith(`You open the way west.`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> opens the way west.`);
      expect(other2.emitTo).toBeCalledWith(`The east way opens.`);
    });

    test('shows message to user if no params', () => {
      callCommand(invoker, 'open');
      expect(invoker.emitTo).toBeCalledWith(`Open what?`);
    });

    test('shows message to user if no exit that direction', () => {
      callCommand(invoker, 'open south');
      expect(invoker.emitTo).toBeCalledWith(`You don't see an exit in that direction.`);
    });

    test('shows message to user if exit not closed', () => {
      callCommand(invoker, 'open north');
      expect(invoker.emitTo).toBeCalledWith(`There is nothing to open in that direction.`);
    });
  });

  describe('close', () => {
    test("closes a door if it's open", () => {
      invoker.room.exits['west'].flags.removeFlag(ExitFlag.CLOSED);
      otherRoom.exits['east'].flags.removeFlag(ExitFlag.CLOSED);
      expect(invoker.room.exits['west'].isClosed()).toBeFalsy();
      callCommand(invoker, 'close west');
      expect(invoker.room.exits['west'].isClosed()).toBeTruthy();
      expect(invoker.emitTo).toBeCalledWith(`You close the way west.`);
      expect(other1.emitTo).toBeCalledWith(`<c>invoker name<n> closes the way west.`);
      expect(other2.emitTo).toBeCalledWith(`The east way closes.`);
    });

    test('shows message to user if no params', () => {
      callCommand(invoker, 'close');
      expect(invoker.emitTo).toBeCalledWith(`Close what?`);
    });

    test('shows message to user if no exit that direction', () => {
      callCommand(invoker, 'close south');
      expect(invoker.emitTo).toBeCalledWith(`You don't see an exit in that direction.`);
    });

    test('shows message to user if exit not opened', () => {
      callCommand(invoker, 'close north');
      expect(invoker.emitTo).toBeCalledWith(`There is nothing to close in that direction.`);
    });
  });
});
