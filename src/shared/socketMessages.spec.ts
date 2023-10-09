import * as socketMessages from './socketMessages';

describe('shared/socketMessages', () => {
  describe('UserLogin', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount', username: 'testUsername', characterName: 'testCharacter' };
      socketMessages.UserLogin.send(socket, payload);
      expect(socket.emit).toBeCalledWith('user.login', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.UserLogin.listen(socket, callback);
      expect(socket.on).toBeCalledWith('user.login', callback);
    });

    test('throws error if socket is undefined on send', () => {
      const payload = { accountId: 'testAccount', username: 'testUsername', characterName: 'testCharacter' };
      expect(() => socketMessages.UserLogin.send(undefined, payload)).toThrowError();
    });

    test('throws error if socket is undefined on listen', () => {
      expect(() => socketMessages.UserLogin.listen(undefined, () => {})).toThrowError();
    });
  });

  describe('CharacterLogin', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount', characterName: 'testCharacter' };
      socketMessages.CharacterLogin.send(socket, payload);
      expect(socket.emit).toBeCalledWith('character.login', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.CharacterLogin.listen(socket, callback);
      expect(socket.on).toBeCalledWith('character.login', callback);
    });
  });

  describe('UserLogout', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount' };
      socketMessages.UserLogout.send(socket, payload);
      expect(socket.emit).toBeCalledWith('user.logout', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.UserLogout.listen(socket, callback);
      expect(socket.on).toBeCalledWith('user.logout', callback);
    });
  });

  describe('UserDisconnect', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount' };
      socketMessages.UserDisconnect.send(socket, payload);
      expect(socket.emit).toBeCalledWith('user.disconnect', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.UserDisconnect.listen(socket, callback);
      expect(socket.on).toBeCalledWith('user.disconnect', callback);
    });
  });

  describe('UserInput', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount', rawInput: 'test input' };
      socketMessages.UserInput.send(socket, payload);
      expect(socket.emit).toBeCalledWith('user.input', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.UserInput.listen(socket, callback);
      expect(socket.on).toBeCalledWith('user.input', callback);
    });
  });

  describe('UserMessage', () => {
    test('emits to socket when send called', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const payload = { accountId: 'testAccount', message: 'test message' };
      socketMessages.UserMessage.send(socket, payload);
      expect(socket.emit).toBeCalledWith('user.message', payload);
    });

    test('wires up callback on listen', () => {
      const socket = {
        emit: jest.fn(),
        on: jest.fn(),
      } as any;
      const callback = jest.fn();
      socketMessages.UserMessage.listen(socket, callback);
      expect(socket.on).toBeCalledWith('user.message', callback);
    });
  });
});
