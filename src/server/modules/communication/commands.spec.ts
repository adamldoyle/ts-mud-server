import { Instance, getGameServerSafely } from '@server/GameServerInstance';
import { buildCharacter, buildPlayer, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from '@core/entities/character';
import { registerCommands } from './commands';

describe('communication/commands', () => {
  let invoker: Character;
  let other: Character;
  beforeEach(() => {
    initializeTestServer();

    const zone = buildZone({}, true);
    const room = buildRoom(zone, 'testRoom');
    invoker = buildCharacter(zone, 'invoker', room);
    other = buildCharacter(zone, 'other', room);
    registerCommands();
  });

  const callCommand = (invoker: Character, rawInput: string) => {
    getGameServerSafely().commandHandler.handleCommand(invoker, rawInput, undefined);
  };

  describe('chat', () => {
    test('sends message to all players', () => {
      const otherZone = buildZone({ key: 'otherZone' }, true);
      const otherRoom = buildRoom(otherZone, 'testRoom');
      const player = buildPlayer('player', otherRoom);
      getGameServerSafely().playersByName = {
        player,
      };
      callCommand(invoker, 'chat test message');
      expect(invoker.emitTo).toBeCalledWith(`You chat, "test message"`);
      expect(player.emitTo).toBeCalledWith(`${invoker} chats, "test message"`);
      expect(other.emitTo).not.toBeCalled();
    });
  });

  describe('shout', () => {
    test('sends message to all characters in zone', () => {
      const otherZone = buildZone({ key: 'otherZone' }, true);
      const otherZoneRoom = buildRoom(otherZone, 'testRoom');
      const otherZoneChar = buildCharacter(otherZone, 'player', otherZoneRoom);
      const otherRoom = buildRoom(invoker.zone, 'otherRoom');
      const otherRoomChar = buildCharacter(invoker.zone, 'otherChar', otherRoom);

      callCommand(invoker, 'shout test message');
      expect(invoker.emitTo).toBeCalledWith(`You shout, "test message"`);
      expect(otherRoomChar.emitTo).toBeCalledWith(`${invoker} shouts, "test message"`);
      expect(other.emitTo).toBeCalledWith(`${invoker} shouts, "test message"`);
      expect(otherZoneChar.emitTo).not.toBeCalled();
    });
  });

  describe('say', () => {
    test('sends message to all characters in room', () => {
      const otherRoom = buildRoom(invoker.zone, 'otherRoom');
      const otherRoomChar = buildCharacter(invoker.zone, 'otherChar', otherRoom);

      callCommand(invoker, 'say test message');
      expect(invoker.emitTo).toBeCalledWith(`You say, "test message"`);
      expect(other.emitTo).toBeCalledWith(`${invoker} says, "test message"`);
      expect(otherRoomChar.emitTo).not.toBeCalled();
    });
  });

  describe('whisper', () => {
    test('sends message to specific character in room', () => {
      const otherChar = buildCharacter(invoker.zone, 'otherChar', invoker.room);

      callCommand(invoker, `whisper ${other.basicKey} test message`);
      expect(invoker.emitTo).toBeCalledWith(`You whisper to ${other}, "test message"`);
      expect(other.emitTo).toBeCalledWith(`<c>invoker name<n> whispers to you, "test message"`);
      expect(otherChar.emitTo).not.toBeCalled();
    });

    test(`can't whisper to someone outside room`, () => {
      const otherRoom = buildRoom(invoker.zone, 'otherRoom');
      const otherChar = buildCharacter(invoker.zone, 'otherChar', otherRoom);

      callCommand(invoker, `whisper ${otherChar.basicKey} test message`);
      expect(invoker.emitTo).toBeCalledWith(`Whisper to whom what?`);
      expect(otherChar.emitTo).not.toBeCalled();
    });
  });

  describe('tell', () => {
    test('sends message to specific player anywhere', () => {
      const otherZone = buildZone({ key: 'otherZone' }, true);
      const otherRoom = buildRoom(otherZone, 'testRoom');
      const player = buildPlayer('player', otherRoom);
      const otherPlayer = buildPlayer('otherPlayer', invoker.room);
      getGameServerSafely().playersByName = {
        player,
        otherPlayer,
      };
      callCommand(invoker, `tell ${player.key} test message`);
      expect(invoker.emitTo).toBeCalledWith(`You tell ${player}, "test message"`);
      expect(player.emitTo).toBeCalledWith(`${invoker} tells you, "test message"`);
      expect(otherPlayer.emitTo).not.toBeCalled();
    });

    test('sends error if no target', () => {
      callCommand(invoker, `tell`);
      expect(invoker.emitTo).toBeCalledWith(`Tell whom what?`);
    });

    test('sends error if no message', () => {
      const player = buildPlayer('player', invoker.room);
      callCommand(invoker, `tell ${player.key}`);
      expect(invoker.emitTo).toBeCalledWith(`Tell whom what?`);
    });

    test('sends error if unknown target', () => {
      getGameServerSafely().playersByName = {};
      callCommand(invoker, `tell notaplayer test message`);
      expect(invoker.emitTo).toBeCalledWith(`They're not around.`);
    });
  });
});
