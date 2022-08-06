import { Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';

type Socket = ServerSocket | ClientSocket;

interface IMessagePayload {
  accountId: string;
}

interface IMessagePair<MessagePayload extends IMessagePayload> {
  send: (socket: Socket | undefined, payload: MessagePayload) => void;
  listen: (socket: Socket | undefined, listener: (payload: MessagePayload) => void) => void;
}

function generateMessagePair<MessagePayload extends IMessagePayload>(name: string): IMessagePair<MessagePayload> {
  return {
    send: (socket, payload) => {
      if (!socket) {
        throw new Error('Tried to send message on bad socket');
      }
      socket.emit(name, payload);
    },
    listen: (socket, listener) => {
      if (!socket) {
        throw new Error('Tried to listen for message on bad socket');
      }
      socket.on(name, listener);
    },
  };
}

export interface IUserLoginPayload extends IMessagePayload {
  username: string;
  characterName?: string;
}
export const UserLogin = generateMessagePair<IUserLoginPayload>('user.login');

export interface ICharacterLoginPayload extends IMessagePayload {
  characterName: string;
}
export const CharacterLogin = generateMessagePair<ICharacterLoginPayload>('character.login');

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IUserLogoutPayload extends IMessagePayload {}
export const UserLogout = generateMessagePair<IUserLogoutPayload>('user.logout');

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IUserDisconnectPayload extends IMessagePayload {}
export const UserDisconnect = generateMessagePair<IUserDisconnectPayload>('user.disconnect');

export interface IUserInputPayload extends IMessagePayload {
  rawInput: string;
}
export const UserInput = generateMessagePair<IUserInputPayload>('user.input');

export interface IUserMessagePayload extends IMessagePayload {
  message: string;
}
export const UserMessage = generateMessagePair<IUserMessagePayload>('user.message');
