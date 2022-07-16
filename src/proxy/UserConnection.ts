import { v4 } from 'uuid';
import { TelnetStream } from './telnet';
import { IAccount } from '@shared/types';
import { IConversation, IUserConnection } from './types';

export class UserTelnetConnection implements IUserConnection {
  id: string;
  client: TelnetStream;
  account?: IAccount;
  conversation?: IConversation;

  constructor(client: TelnetStream) {
    this.id = v4();
    this.client = client;
    this.account = undefined;
    this.conversation = undefined;
  }

  setKeepAliveSeconds(enable: boolean, seconds: number): void {
    this.client.clientSocket.setKeepAlive(enable, 1000 * seconds);
  }

  setTimeout(seconds: number): void {
    this.client.clientSocket.setTimeout(seconds);
  }

  send(message: string): void {
    if (!message || !message.length || message.trim() == '') {
      return;
    }

    message = message.replace(/(?:\r|\n)/g, '\r\n');

    if (message && message.charAt(message.length - 2) !== '\\') {
      message += '\r\n';
    }

    this.client.send(message);
  }

  getClientIp(): string {
    return this.client.clientSocket.remoteAddress.replace(/^.*:/, '');
  }

  end() {
    this.client.endConnection();
  }
}
