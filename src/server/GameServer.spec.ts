import fs from 'fs';
import { Server } from 'socket.io';
import { ISettings } from '@shared/types';
import { GameServer, TICK_TIME } from './GameServer';
import { Instance, getCatalogSafely } from './GameServerInstance';
import { buildCharacter, buildPlayer } from './testUtils';
import { buildCommandHandler } from './modules/core/commands/CommandHandler';
import * as account from '@shared/account';
import { LoginConversation } from '@modules/auth/LoginConversation';
import { calculateTime } from '@modules/calendar';

jest.useFakeTimers();
jest.mock('socket.io');
jest.mock('fs');
jest.mock('@shared/account');
jest.mock('@modules/auth/LoginConversation');
jest.mock('@modules/calendar');

describe('GameServer', () => {
  let config: ISettings;
  let gameServer: GameServer;
  let listen: jest.Mock;
  let socketServer: {
    on: jest.Mock;
  };
  beforeEach(() => {
    socketServer = {
      on: jest.fn(),
    };
    listen = jest.fn().mockReturnValue(socketServer);
    (Server as unknown as jest.Mock).mockReturnValue({
      listen,
    });

    config = {
      proxyPort: 10,
      serverPort: 20,
      startingRoom: 'limbo@limbo', // If you remove limbo, might need to adjust this
    };
    (calculateTime as jest.Mock).mockReturnValue({ timeOfDay: 'MORNING' });
    gameServer = new GameServer(config);
    Instance.gameServer = gameServer;
  });

  describe('constructor', () => {
    test('initializes defaults and sets up catalog and command handler', () => {
      expect(gameServer.config).toEqual(config);
      expect(gameServer.playersById).toEqual({});
      expect(gameServer.playersByName).toEqual({});
      expect(gameServer.partialLogins).toEqual({});
      expect(gameServer.tickCounter).toEqual(0);
      expect(gameServer.proxySocket).toBeUndefined();
      expect(gameServer.catalog).toBeDefined();
      expect(gameServer.commandHandler).toBeDefined();
    });
  });

  describe('start', () => {
    test('registers all commands with handler', () => {
      expect(gameServer.commandHandler.getCommandDefinitions().length).toEqual(0);
      gameServer.start();
      expect(gameServer.commandHandler.getCommandDefinitions().length).toBeGreaterThan(0);
    });

    test('registers all zones', () => {
      expect(gameServer.catalog.getZones().length).toEqual(0);
      gameServer.start();
      expect(gameServer.catalog.getZones().length).toBeGreaterThan(0);
    });

    test('starts the socket server', () => {
      expect(listen).not.toBeCalled();
      expect(socketServer.on).not.toBeCalled();
      gameServer.start();
      expect(listen).toBeCalledWith(20);
      expect(socketServer.on).toBeCalledWith('connection', expect.anything());
    });
  });

  const startWithMockSocket = (socket?: { on: jest.Mock }) => {
    gameServer.start();
    expect(socketServer.on).toBeCalled();
    socketServer.on.mock.calls[0][1](
      socket ?? {
        on: jest.fn(),
        emit: jest.fn(),
      }
    );
    jest.spyOn(gameServer, 'sendMessageToCharacter');
  };

  describe('onSocketConnect', () => {
    test('is hooked up via start() and is called when proxy server connects to further connect socket calls', () => {
      const socket = {
        on: jest.fn(),
      };
      startWithMockSocket(socket);

      expect(gameServer.proxySocket).toEqual(socket);
      expect(socket.on).toBeCalledWith('disconnect', expect.anything());
      expect(socket.on).toBeCalledWith('user.login', expect.anything());
      expect(socket.on).toBeCalledWith('user.input', expect.anything());
      expect(socket.on).toBeCalledWith('user.disconnect', expect.anything());
    });

    test('starts the tick counter', () => {
      jest.spyOn(gameServer, 'tick');
      startWithMockSocket();
      expect(gameServer.tick).not.toBeCalled();
      jest.advanceTimersByTime(TICK_TIME);
      expect(gameServer.tick).toBeCalledTimes(1);
      jest.advanceTimersByTime(TICK_TIME);
      expect(gameServer.tick).toBeCalledTimes(2);
    });
  });

  describe('sendMessageToAccount', () => {
    test('emits message for account id to proxy socket', () => {
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      gameServer.sendMessageToAccount('testAccount', 'test message');
      expect(socket.emit).toBeCalledWith('user.message', { accountId: 'testAccount', message: 'test message' });
    });
  });

  describe('sendMessageToCharacter', () => {
    test('emits message to player by name', () => {
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      gameServer.playersByName['charname'] = { accountId: 'testAccount' } as any;
      gameServer.sendMessageToCharacter('charname', 'test message');
      expect(socket.emit).toBeCalledWith('user.message', { accountId: 'testAccount', message: 'test message' });
    });
  });

  const generatePlayer = (key = 'player') => {
    const room = getCatalogSafely()
      .getZones()
      .map((zone) => Object.values(zone.rooms))
      .flat()[0];
    if (!room) {
      throw new Error('Need at least one room');
    }
    return buildPlayer(key, room);
  };

  describe('onUserInput', () => {
    test('sends input to partial logins', () => {
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      const handleInput = jest.fn();
      gameServer.partialLogins['testAccount'] = { handleInput } as any;
      expect(socket.on).toBeCalledWith('user.input', expect.anything());
      const onUserInput = socket.on.mock.calls.find((call) => call[0] === 'user.input')[1];
      onUserInput({ accountId: 'testAccount', rawInput: 'input from user' });
      expect(handleInput).toBeCalledWith('input from user');
    });

    test('handles input as a command ', () => {
      jest.spyOn(gameServer, 'handleCommand');
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      const player = generatePlayer();
      gameServer.playersById['testAccount'] = player;
      expect(socket.on).toBeCalledWith('user.input', expect.anything());
      const onUserInput = socket.on.mock.calls.find((call) => call[0] === 'user.input')[1];
      onUserInput({ accountId: 'testAccount', rawInput: 'input from user' });
      expect(gameServer.handleCommand).toBeCalledWith(player, 'input from user');
    });
  });

  describe('handleCommand', () => {
    test('routes input to conversation command handler', () => {
      startWithMockSocket();
      const handleConversationCommand = jest.fn().mockReturnValue(true);
      const player = generatePlayer();
      player.conversation = { handleConversationCommand } as any;
      gameServer.handleCommand(player, 'input from user');
      expect(handleConversationCommand).toBeCalledWith(player, 'input from user');
      expect(gameServer.sendMessageToCharacter).not.toBeCalled();
    });

    test('routes input to room command handler', () => {
      startWithMockSocket();
      const player = generatePlayer();
      player.room.commandHandler = buildCommandHandler();
      jest.spyOn(player.room.commandHandler, 'handleCommand').mockReturnValue(true);
      gameServer.handleCommand(player, 'input from user');
      expect(player.room.commandHandler.handleCommand).toBeCalledWith(player, 'input from user', player.room);
      expect(gameServer.sendMessageToCharacter).not.toBeCalled();
    });

    test('routes input to character in room command handler', () => {
      startWithMockSocket();
      const player = generatePlayer();
      const character = buildCharacter(player.room.zone, 'other', player.room);
      character.commandHandler = buildCommandHandler();
      jest.spyOn(character.commandHandler, 'handleCommand').mockReturnValue(true);
      gameServer.handleCommand(player, 'input from user');
      expect(character.commandHandler.handleCommand).toBeCalledWith(player, 'input from user', character);
      expect(gameServer.sendMessageToCharacter).not.toBeCalled();
    });

    test('routes input to game server command handler', () => {
      startWithMockSocket();
      const player = generatePlayer();
      jest.spyOn(gameServer.commandHandler, 'handleCommand').mockReturnValue(true);
      gameServer.handleCommand(player, 'input from user');
      expect(gameServer.commandHandler.handleCommand).toBeCalledWith(player, 'input from user', undefined);
      expect(gameServer.sendMessageToCharacter).not.toBeCalled();
    });

    test('messages character about unknown command', () => {
      startWithMockSocket();
      const player = generatePlayer();
      jest.spyOn(gameServer.commandHandler, 'handleCommand').mockReturnValue(false);
      gameServer.handleCommand(player, 'input from user');
      expect(gameServer.commandHandler.handleCommand).toBeCalledWith(player, 'input from user', undefined);
      expect(gameServer.sendMessageToCharacter).toBeCalledWith(player.name, 'Unknown command');
    });
  });

  describe('injectPlayerToGame', () => {
    test('adds player to game server dictionaries', () => {
      startWithMockSocket();
      expect(gameServer.playersById).toEqual({});
      expect(gameServer.playersByName).toEqual({});
      const player = generatePlayer();
      gameServer.injectPlayerToGame(player.accountId, player, false);
      expect(gameServer.playersById).toEqual({ [player.accountId]: player });
      expect(gameServer.playersByName).toEqual({ [player.name]: player });
    });

    test('disconnects existing player if it exists', () => {
      startWithMockSocket();
      const oldPlayer = generatePlayer('oldPlayer');
      oldPlayer.accountId = 'player';
      jest.spyOn(oldPlayer, 'disconnect');
      gameServer.playersById[oldPlayer.accountId] = oldPlayer;
      const player = generatePlayer();
      gameServer.injectPlayerToGame(player.accountId, player, false);
      expect(gameServer.playersById).toEqual({ [player.accountId]: player });
      expect(gameServer.playersByName).toEqual({ [player.name]: player });
      expect(oldPlayer.disconnect).toBeCalled();
    });

    test('deletes partial login for account', () => {
      startWithMockSocket();
      const player = generatePlayer();
      gameServer.partialLogins[player.accountId];
      gameServer.injectPlayerToGame(player.accountId, player, false);
      expect(gameServer.partialLogins).toEqual({});
    });

    test('finalizes player and makes them look', () => {
      startWithMockSocket();
      const player = generatePlayer();
      jest.spyOn(player, 'finalize');
      jest.spyOn(player, 'sendCommand');
      gameServer.injectPlayerToGame(player.accountId, player, true);
      expect(player.finalize).toBeCalledWith(true);
      expect(player.sendCommand).toBeCalledWith('look');
    });

    test('sends message to proxy about login', () => {
      startWithMockSocket();
      const player = generatePlayer();
      gameServer.injectPlayerToGame(player.accountId, player, false);
      expect(gameServer.proxySocket?.emit).toBeCalledWith('character.login', { accountId: player.accountId, characterName: player.name });
    });
  });

  describe('onUserLogin', () => {
    test(`invalid account doesn't login (this shouldn't happen since proxy also checks it)`, () => {
      (account.getPotentialAccount as jest.Mock).mockReturnValue(undefined);
      const socket = {
        on: jest.fn(),
      };
      startWithMockSocket(socket);
      expect(socket.on).toBeCalledWith('user.login', expect.anything());
      const onUserLogin = socket.on.mock.calls.find((call) => call[0] === 'user.login')[1];
      onUserLogin({ accountId: 'testAccountId', username: 'testUsername' });
      expect(gameServer.playersById).toEqual({});
      expect(gameServer.partialLogins).toEqual({});
    });

    test(`logs in character if payload includes character name`, () => {
      (account.getPotentialAccount as jest.Mock).mockReturnValue({ accountId: 'testAccountId' });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ accountId: 'testAccountId', room: 'limbo@limbo', key: 'testcharacter', name: 'Testcharacter' })
      );
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      expect(socket.on).toBeCalledWith('user.login', expect.anything());
      const onUserLogin = socket.on.mock.calls.find((call) => call[0] === 'user.login')[1];
      onUserLogin({ accountId: 'testAccountId', username: 'testUsername', characterName: 'testCharacter' });
      expect(Object.keys(gameServer.playersById)).toEqual(['testAccountId']);
      expect(gameServer.partialLogins).toEqual({});
    });

    test(`starts LoginConversation if no character passed`, () => {
      const playerAccount = { accountId: 'testAccountId', characterNames: ['Testcharacter'] };
      (account.getPotentialAccount as jest.Mock).mockReturnValue(playerAccount);
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      expect(socket.on).toBeCalledWith('user.login', expect.anything());
      const onUserLogin = socket.on.mock.calls.find((call) => call[0] === 'user.login')[1];
      onUserLogin({ accountId: 'testAccountId', username: 'testUsername' });
      expect(gameServer.playersById).toEqual({});
      expect(Object.keys(gameServer.partialLogins)).toEqual(['testAccountId']);
      expect(LoginConversation).toBeCalledWith(playerAccount, expect.anything());
      const player = generatePlayer();
      (LoginConversation as jest.Mock).mock.calls[0][1](player);
      expect(Object.keys(gameServer.playersById)).toEqual(['testAccountId']);
      expect(gameServer.partialLogins).toEqual({});
    });

    test(`throws error if LoginConversation does not pass user to callback`, () => {
      const playerAccount = { accountId: 'testAccountId', characterNames: ['Testcharacter'] };
      (account.getPotentialAccount as jest.Mock).mockReturnValue(playerAccount);
      const socket = {
        on: jest.fn(),
        emit: jest.fn(),
      };
      startWithMockSocket(socket);
      expect(socket.on).toBeCalledWith('user.login', expect.anything());
      const onUserLogin = socket.on.mock.calls.find((call) => call[0] === 'user.login')[1];
      onUserLogin({ accountId: 'testAccountId', username: 'testUsername' });
      expect(gameServer.playersById).toEqual({});
      expect(Object.keys(gameServer.partialLogins)).toEqual(['testAccountId']);
      expect(LoginConversation).toBeCalledWith(playerAccount, expect.anything());
      (LoginConversation as jest.Mock).mock.calls[0][1](undefined);
      expect(Object.keys(gameServer.playersById)).toEqual([]);
      expect(Object.keys(gameServer.partialLogins)).toEqual(['testAccountId']);
    });
  });

  describe('logoutUser', () => {
    test('removes player from game', () => {
      startWithMockSocket();
      const player = generatePlayer();
      jest.spyOn(player, 'disconnect');
      gameServer.playersById[player.accountId] = player;
      gameServer.playersByName[player.name] = player;
      gameServer.logoutUser(player.accountId);
      expect(player.disconnect).toBeCalled();
      expect(gameServer.playersById).toEqual({});
      expect(gameServer.playersByName).toEqual({});
    });

    test('sends logout message to proxy', () => {
      startWithMockSocket();
      const player = generatePlayer();
      gameServer.playersById[player.accountId] = player;
      gameServer.playersByName[player.name] = player;
      gameServer.logoutUser(player.accountId);
      expect(gameServer.proxySocket?.emit).toBeCalledWith('user.logout', { accountId: player.accountId });
    });

    test('removes parital logins', () => {
      startWithMockSocket();
      gameServer.partialLogins['testAccountId'] = {} as any;
      gameServer.logoutUser('testAccountId');
      expect(gameServer.partialLogins).toEqual({});
    });
  });

  describe('onSocketDisconnect', () => {
    test('disconnects and clears all player data', () => {
      const disconnect1 = jest.fn();
      const disconnect2 = jest.fn();
      startWithMockSocket();
      if (!gameServer.proxySocket) {
        throw new Error('proxySocket missing');
      }
      gameServer.playersById = { testAccount1: { disconnect: disconnect1 } as any, testAccount2: { disconnect: disconnect2 } as any };
      expect(gameServer.proxySocket.on).toBeCalledWith('disconnect', expect.anything());
      const onSocketDisconnect = (gameServer.proxySocket.on as jest.Mock).mock.calls.find((call) => call[0] === 'disconnect')[1];
      onSocketDisconnect();
      expect(disconnect1).toBeCalled();
      expect(disconnect2).toBeCalled();
      expect(gameServer.playersById).toEqual({});
      expect(gameServer.playersByName).toEqual({});
      expect(gameServer.partialLogins).toEqual({});
    });
  });

  describe('tick', () => {
    test('calls tick on every zone', () => {
      startWithMockSocket();
      gameServer.catalog.getZones().map((zone) => {
        jest.spyOn(zone, 'tick');
      });
      gameServer.tick();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.tick).toBeCalledWith(1);
      });
      gameServer.tick();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.tick).toBeCalledWith(2);
      });
    });

    test('calls newTimeOfDay on every zone if timeOfDay changes', () => {
      (calculateTime as jest.Mock).mockReturnValue({ timeOfDay: 'MORNING' });
      startWithMockSocket();
      gameServer.catalog.getZones().map((zone) => {
        jest.spyOn(zone, 'newTimeOfDay');
      });
      gameServer.tick();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.newTimeOfDay).toBeCalledWith('MORNING');
      });
      jest.clearAllMocks();
      gameServer.tick();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.newTimeOfDay).not.toBeCalled();
      });
      (calculateTime as jest.Mock).mockReturnValue({ timeOfDay: 'LATE_MORNING' });
      jest.clearAllMocks();
      gameServer.tick();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.newTimeOfDay).toBeCalledWith('LATE_MORNING');
      });
    });
  });

  describe('save', () => {
    test('dumps all zones to storage', () => {
      startWithMockSocket();
      gameServer.catalog.getZones().map((zone) => {
        jest.spyOn(zone, 'toStorage');
      });
      gameServer.save();
      gameServer.catalog.getZones().map((zone) => {
        expect(zone.toStorage).toBeCalled();
      });
    });

    test('saves all players', () => {
      startWithMockSocket();
      const player = { save: jest.fn() };
      gameServer.playersById['testPlayer'] = player as any;
      gameServer.save();
      expect(player.save).toBeCalled();
    });
  });
});
