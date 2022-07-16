import net from 'net';
import { io, Socket } from 'socket.io-client';
import { logger, playerLogger } from '@shared/Logger';
import { ISettings } from '@shared/types';
import {
  UserLogin,
  UserLogout,
  UserMessage,
  IUserMessagePayload,
  IUserLogoutPayload,
  UserInput,
  UserDisconnect,
  CharacterLogin,
  ICharacterLoginPayload,
} from '@shared/socketMessages';
import { TelnetStream } from './telnet';
import { UserTelnetConnection } from './UserConnection';
import { LoginConversation } from './LoginConversation';
import { IProxyServer, IUserConnection } from './types';
import { colorMessage } from '@shared/color';

export class ProxyServer implements IProxyServer {
  config: ISettings;
  userConnections: IUserConnection[];
  charactersLoggedIn: Record<string, string>;
  server: net.Server;
  gameSocket: Socket;
  connectedToGameServer: boolean;

  constructor(config: ISettings) {
    this.config = config;

    this.userConnections = [];
    this.charactersLoggedIn = {};

    this.server = net.createServer(this.onUserTelnetConnect.bind(this));

    this.gameSocket = io(`http://localhost:${this.config.serverPort}`);
    this.gameSocket.on('connect', this.onGameSocketConnect.bind(this));
    this.gameSocket.on('disconnect', this.onGameSocketDisconnect.bind(this));

    UserLogout.listen(this.gameSocket, this.onUserLogout.bind(this));
    UserMessage.listen(this.gameSocket, this.onUserMessage.bind(this));
    CharacterLogin.listen(this.gameSocket, this.onCharacterLogin.bind(this));

    this.connectedToGameServer = false;
  }

  start() {
    this.server.listen(this.config.proxyPort);
    logger.info(`Proxy server started`, { port: this.config.proxyPort });
  }

  onUserTelnetConnect(socket: net.Socket): void {
    try {
      const client = new TelnetStream(socket);
      const userConnection = new UserTelnetConnection(client);

      this.userConnections.push(userConnection);

      client.on('input', this.onInput.bind(this, userConnection));
      client.on('socketError', this.onSocketError.bind(this, userConnection));
      client.on('disconnect', this.onUserDisconnect.bind(this, userConnection));

      userConnection.client.willMCCP2();
      userConnection.client.willMXP();
      userConnection.client.doEcho();
      userConnection.setTimeout(0);
      userConnection.setKeepAliveSeconds(true, 10);

      userConnection.conversation = new LoginConversation(userConnection);

      logger.info(`User connected ${userConnection.getClientIp()}`);
    } catch (exception) {
      socket.write('There was a problem while creating a connection with the proxy server.');
      logger.error(exception);
    }
  }

  onUserLogin(userConnection: IUserConnection, characterName?: string) {
    if (!userConnection.account) {
      logger.error('Tried to send user login message without account');
      return;
    }
    logger.info(`onUserLogin`, { accountId: userConnection.account.accountId, characterName });
    UserLogin.send(this.gameSocket, { accountId: userConnection.account.accountId, username: userConnection.account.username, characterName });
  }

  onUserLogout(payload: IUserLogoutPayload) {
    this.userConnections.forEach((userConnection) => {
      if (userConnection.account?.accountId === payload.accountId) {
        this.disconnectUser(userConnection);
      }
    });
  }

  onUserMessage(payload: IUserMessagePayload) {
    this.userConnections.forEach((userConnection) => {
      if (userConnection.account?.accountId === payload.accountId) {
        this.sendToUserConnection(userConnection, payload.message);
      }
    });
  }

  onCharacterLogin(payload: ICharacterLoginPayload) {
    logger.info(`Character logged in for account`, { accountId: payload.accountId, characterName: payload.characterName });
    this.charactersLoggedIn[payload.accountId] = payload.characterName;
  }

  onGameSocketConnect() {
    logger.info('Connected to game server');
    this.userConnections.forEach((userConnection) => {
      if (userConnection.account) {
        this.onUserLogin(userConnection, this.charactersLoggedIn[userConnection.account.accountId]);
        this.sendToUserConnection(userConnection, 'The haze clears, and you regain your senses.');
      }
    });
    this.connectedToGameServer = true;
  }

  onGameSocketDisconnect() {
    logger.info('Disconnected from game server');
    this.userConnections.forEach((userConnection) => {
      if (userConnection.account) {
        this.sendToUserConnection(userConnection, 'Everything goes blurry, and you find yourself unable to move.');
      }
    });
    this.connectedToGameServer = false;
  }

  sendToUserConnection(userConnection: IUserConnection, message: string) {
    try {
      userConnection.send(colorMessage(`<n>${message}<n>`));
    } catch (exception) {
      logger.error(exception);
    }
  }

  onInput(userConnection: IUserConnection, rawInput: string) {
    playerLogger.log({
      accountId: userConnection.account?.accountId,
      characterName: this.charactersLoggedIn[userConnection.account?.accountId ?? ''],
      rawInput,
    });
    try {
      if (userConnection.conversation) {
        userConnection.conversation.handleInput(rawInput);
        return;
      }

      if (!this.connectedToGameServer) {
        this.sendToUserConnection(userConnection, 'Everything around you is hazy...');
        return;
      }

      if (!userConnection.account?.accountId) {
        return;
      }

      UserInput.send(this.gameSocket, { accountId: userConnection.account.accountId, rawInput });
    } catch (exception) {
      this.sendToUserConnection(userConnection, 'There was a problem with that command. It has been logged. If it continues please contact an Admin.');
      logger.error(exception);
    }
  }

  onSocketError(socketError: unknown, userConnection: IUserConnection) {
    logger.info(`Socket errored`, socketError);
    this.disconnectUser(userConnection);
  }

  onUserDisconnect(userConnection: IUserConnection) {
    logger.info('onUserDisconnect');
    this.disconnectUser(userConnection);
  }

  disconnectUser(userConnection: IUserConnection) {
    logger.info(`disconnectUser`, { ip: userConnection?.getClientIp?.() });
    if (userConnection.account?.accountId) {
      logger.info(`sending UserDisconnect ${userConnection.account.accountId}`);
      UserDisconnect.send(this.gameSocket, { accountId: userConnection.account.accountId });
    }
    this.userConnections = this.userConnections.filter((otherConnection) => otherConnection.id !== userConnection.id);
    userConnection.end?.();
  }
}

export const Instance: { proxyServer?: ProxyServer } = {
  proxyServer: undefined,
};
