import { ISettings } from '@shared/types';
import { TelnetStream } from './telnet';
import { IAccount } from '@shared/types';

export interface IConversation {
  handleInput(rawInput: string): void;
}

export interface IUserConnection {
  id: string;
  account?: IAccount;
  getClientIp: () => string;
  conversation?: IConversation;
  send: (message: string) => void;
  end: () => void;
  client: TelnetStream;
}

export interface IProxyServer {
  config: ISettings;
  userConnections: IUserConnection[];
  onUserLogin: (userConnection: IUserConnection) => void;
  disconnectUser: (userConnection: IUserConnection) => void;
}

export interface IProxyGlobals {
  proxyServer?: IProxyServer;
}
