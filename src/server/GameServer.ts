import fs from 'fs';
import { Server, Socket } from 'socket.io';
import { logger } from '@shared/Logger';
import { ISettings } from '@shared/types';
import {
  UserLogin,
  UserLogout,
  UserInput,
  IUserInputPayload,
  UserMessage,
  UserDisconnect,
  IUserDisconnectPayload,
  IUserLoginPayload,
  CharacterLogin,
} from '@shared/socketMessages';
import { Player, Character } from '@core/entities/character';
import { buildCommandHandler, ICommandHandler } from '@core/commands/CommandHandler';
import { createCatalog, ICatalog } from '@core/entities/catalog';
import { LoginConversation } from '@modules/auth/LoginConversation';
import { getPotentialAccount } from '@shared/account';
import { calculateTime, TimeOfDay } from '@modules/calendar';
import { registerCommands } from './modules';
import { registerZones } from './zones';

export const TICK_TIME = 1000;

export class GameServer {
  config: ISettings;
  playersById: Record<string, Player>;
  playersByName: Record<string, Player>;
  partialLogins: Record<string, LoginConversation>;
  proxySocket?: Socket;
  tickIntervalId?: ReturnType<typeof setInterval>;
  tickCounter: number;
  timeOfDay?: TimeOfDay;
  catalog: ICatalog;
  commandHandler: ICommandHandler;

  constructor(config: ISettings) {
    this.config = config;
    this.playersById = {};
    this.playersByName = {};
    this.partialLogins = {};
    this.tickCounter = 0;

    this.proxySocket = undefined;

    this.catalog = createCatalog();
    this.commandHandler = buildCommandHandler();
  }

  start() {
    registerCommands();
    registerZones();
    logger.info(`Game server data initialized`);

    const socketServer = new Server().listen(this.config.serverPort);
    socketServer.on('connection', this.onSocketConnect.bind(this));
    logger.info(`Game server started`, { port: this.config.serverPort });
  }

  private onSocketConnect(socket: Socket) {
    logger.info('Proxy server connected');
    this.proxySocket = socket;
    socket.on('disconnect', this.onSocketDisconnect.bind(this));
    UserLogin.listen(socket, this.onUserLogin.bind(this));
    UserInput.listen(socket, this.onUserInput.bind(this));
    UserDisconnect.listen(socket, this.onUserDisconnect.bind(this));

    this.tickIntervalId = setInterval(this.tick.bind(this), TICK_TIME);
  }

  sendMessageToAccount(accountId: string, message: string) {
    UserMessage.send(this.proxySocket, {
      accountId,
      message,
    });
  }

  sendMessageToCharacter(name: string, message: string) {
    const accountId = this.playersByName[name.toLowerCase()]?.accountId;
    if (!accountId) {
      return;
    }
    this.sendMessageToAccount(this.playersByName[name.toLowerCase()].accountId, message);
  }

  private onUserInput(payload: IUserInputPayload) {
    const player = this.playersById[payload.accountId];
    if (this.partialLogins[payload.accountId]) {
      this.partialLogins[payload.accountId].handleInput(payload.rawInput);
    } else if (player) {
      this.handleCommand(player, payload.rawInput);
    }
  }

  handleCommand(player: Character, rawInput: string) {
    if (player.conversation?.handleConversationCommand(player, rawInput)) {
      return;
    }

    if (player.room.commandHandler?.handleCommand(player, rawInput, player.room)) {
      return;
    }

    for (let i = 0; i < player.room.characters.length; i++) {
      if (player.room.characters[i].commandHandler?.handleCommand(player, rawInput, player.room.characters[i])) {
        return;
      }
    }

    if (this.commandHandler.handleCommand(player, rawInput, undefined)) {
      return;
    }

    this.sendMessageToCharacter(player.name, 'Unknown command');
  }

  injectPlayerToGame(accountId: string, player: Player, suppressEmit: boolean) {
    if (this.playersById[accountId]) {
      const oldPlayer = this.playersById[accountId];
      oldPlayer.disconnect();
    }
    this.playersById[accountId] = player;
    this.playersByName[player.name.toLowerCase()] = player;
    delete this.partialLogins[accountId];
    player.finalize(suppressEmit);
    logger.info(`injectPlayerToGame`, { accountId, characterName: player.name });
    CharacterLogin.send(this.proxySocket, { accountId, characterName: player.name });
    player.sendCommand('look');
  }

  private onUserLogin(payload: IUserLoginPayload) {
    const account = getPotentialAccount(payload.username);
    if (!account || payload.accountId !== account.accountId) {
      return logger.error(`Invalid account lookup`, { characterName: payload.username, accountId: payload.accountId });
    }

    if (payload.characterName) {
      const player = Player.load(payload.characterName);
      if (player) {
        this.injectPlayerToGame(payload.accountId, player, true);
        return;
      }
    }

    this.partialLogins[account.accountId] = new LoginConversation(account, (player) => {
      if (!player) {
        return logger.error('Missing player', { accountId: account.accountId });
      }

      this.injectPlayerToGame(payload.accountId, player, false);
    });
  }

  logoutUser(accountId: string) {
    this.onUserDisconnect({ accountId });
    UserLogout.send(this.proxySocket, { accountId: accountId });
  }

  private onUserDisconnect(payload: IUserDisconnectPayload) {
    logger.info(`onUserDisconnect`, { accountId: payload.accountId });
    if (this.playersById[payload.accountId]) {
      const player = this.playersById[payload.accountId];
      player.disconnect();
      delete this.playersByName[player.name.toLowerCase()];
      delete this.playersById[payload.accountId];
    }
    delete this.partialLogins[payload.accountId];
  }

  private onSocketDisconnect() {
    logger.info('Proxy server disconnected');
    this.proxySocket = undefined;
    Object.values(this.playersById).map((player) => {
      player.disconnect(true);
    });
    this.playersById = {};
    this.playersByName = {};
    this.partialLogins = {};
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = undefined;
    }
  }

  tick() {
    this.tickCounter++;
    const newTimeOfDay = calculateTime().timeOfDay;
    if (this.timeOfDay !== newTimeOfDay) {
      this.catalog.getZones().forEach((zone) => {
        zone.newTimeOfDay(newTimeOfDay);
      });
      this.timeOfDay = newTimeOfDay;
    }
    this.catalog.getZones().forEach((zone) => {
      zone.tick(this.tickCounter);
    });
  }

  save() {
    console.log('Dumping zones');
    this.catalog.getZones().forEach((zone) => {
      zone.toStorage();
    });
    console.log('Saving players');
    Object.values(this.playersById).forEach((player) => {
      player.save();
    });
  }
}
