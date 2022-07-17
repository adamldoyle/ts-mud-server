import { Instance } from '@server/GameServerInstance';
import { createCatalog } from '@core/entities/catalog';
import { Character, Player } from '@core/entities/character';
import { buildCharacter, buildPlayer, buildRoom, buildZone } from '@core/entities/testUtils';
import { buildCommandHandler } from './CommandHandler';
import { registerCommands } from './commands';
import { calculateTime } from '@server/modules/calendar';

describe('core/commands/commands', () => {
  let player: Player;
  let npc: Character;
  beforeEach(() => {
    Instance.gameServer = {
      commandHandler: buildCommandHandler(),
      catalog: createCatalog(),
      logoutUser: jest.fn(),
    } as any;

    const zone = buildZone({}, true);
    const room = buildRoom(zone, 'testRoom');
    player = buildPlayer('player', room);
    npc = buildCharacter(zone, 'npc', room);
    registerCommands();
  });

  const callCommand = (invoker: Character, rawInput: string) => {
    Instance.gameServer?.commandHandler.handleCommand(invoker, rawInput, undefined);
  };

  describe('quit', () => {
    test('logs out players', () => {
      callCommand(player, 'quit');
      expect(Instance.gameServer?.logoutUser).toBeCalledWith(player.accountId);
    });

    test('no op for npcs', () => {
      callCommand(npc, 'quit');
      expect(Instance.gameServer?.logoutUser).not.toBeCalled();
    });
  });

  describe('commands', () => {
    test('outputs registered commands', () => {
      Instance.gameServer?.commandHandler.registerCommand({
        name: 'testcommand',
        handler: () => {},
      });
      callCommand(npc, 'commands');
      expect(npc.emitTo).toBeCalledTimes(1);
      const output = (npc.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).toContain('testcommand');
    });

    test('outputs admin commands for admins', () => {
      Instance.gameServer?.commandHandler.registerCommand({
        name: 'testcommand',
        admin: true,
        handler: () => {},
      });
      callCommand(npc, 'commands');
      expect(npc.emitTo).toBeCalledTimes(1);
      let output = (npc.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).not.toContain('testcommand');

      const admin = buildCharacter(npc.zone, 'admin', npc.room, { admin: true });
      callCommand(admin, 'commands');
      expect(admin.emitTo).toBeCalledTimes(1);
      output = (admin.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).toContain('testcommand');
    });
  });

  describe('save', () => {
    test('calls save on character', () => {
      jest.spyOn(npc, 'save').mockImplementation(() => undefined);
      callCommand(npc, 'save');
      expect(npc.save).toBeCalledTimes(1);
    });
  });

  describe('time', () => {
    test('emits the time to the character', () => {
      const time = calculateTime().full;
      callCommand(npc, 'time');
      expect(npc.emitTo).toBeCalledTimes(1);
      let output = (npc.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).toEqual(time);
    });
  });

  describe('colors', () => {
    test('outputs different color codes', () => {
      callCommand(npc, 'colors');
      expect(npc.emitTo).toBeCalledTimes(1);
      let output = (npc.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).toContain(`<B>B - Blue`);
      expect(output).toContain(`<r>r - Red`);
    });
  });

  describe('who', () => {
    test('outputs admins and players logged in', () => {
      if (!Instance.gameServer) {
        throw new Error('Invalid test state');
      }
      Instance.gameServer.playersByName = {
        admin1: { admin: true, key: 'admin1', toString: () => 'Admin1' } as any,
        admin2: { admin: true, key: 'admin2', toString: () => 'Admin2' } as any,
        player1: { key: 'player1', toString: () => 'Player1' } as any,
        player2: { key: 'player2', toString: () => 'Player2' } as any,
      };
      callCommand(npc, 'who');
      expect(npc.emitTo).toBeCalledTimes(1);
      let output = (npc.emitTo as jest.Mock).mock.calls[0][0];
      expect(output).toContain(`Admins: Admin1, Admin2`);
      expect(output).toContain(`Players: Player1, Player2`);
    });
  });
});
