import { buildCharacter, buildRoom, buildZone } from '../entities/testUtils';
import { buildCommandHandler, parseInput } from './CommandHandler';

describe('core/commands/CommandHandler', () => {
  describe('parseInput', () => {
    test('splits rawInput into appropriate pieces', () => {
      const result = parseInput('give item to person');
      expect(result.rawInput).toEqual('give item to person');
      expect(result.command).toEqual('give');
      expect(result.rest).toEqual('item to person');
      expect(result.params).toEqual(['item', 'to', 'person']);
    });

    test('converts command to lowercase', () => {
      const result = parseInput('GIVE it');
      expect(result.command).toEqual('give');
    });

    test('strips extra whitespace from rest and params', () => {
      const result = parseInput('give   item    to    person    ');
      expect(result.rawInput).toEqual('give   item    to    person    ');
      expect(result.rest).toEqual('item to person');
      expect(result.params).toEqual(['item', 'to', 'person']);
    });
  });

  describe('buildCommandHandler', () => {
    test('supports registering a command', () => {
      const zone = buildZone();
      const room = buildRoom(zone, 'testRoom');
      const invoker = buildCharacter(zone, 'invoker', room);
      const handler = buildCommandHandler();
      const mockHandler = jest.fn();
      const definition = { name: 'command', handler: mockHandler };
      handler.registerCommand(definition);
      const definitions = handler.getCommandDefinitions();
      expect(definitions).toEqual([definition]);
      expect(handler.handleCommand(invoker, 'command', undefined)).toBeTruthy();
      expect(mockHandler).toBeCalled();
    });

    test('does nothing if command already registered', () => {
      const handler = buildCommandHandler();
      const definition = { name: 'testCommand', handler: () => {} };
      handler.registerCommand(definition);
      handler.registerCommand({ name: 'testCommand', handler: () => {} });
      const definitions = handler.getCommandDefinitions();
      expect(definitions).toEqual([definition]);
    });

    test('registers aliases for command', () => {
      const zone = buildZone();
      const room = buildRoom(zone, 'testRoom');
      const invoker = buildCharacter(zone, 'invoker', room);
      const handler = buildCommandHandler();
      const mockHandler = jest.fn();
      const definition = { name: 'command', aliases: ['command2'], handler: mockHandler };
      handler.registerCommand(definition);
      expect(handler.handleCommand(invoker, 'command2', undefined)).toBeTruthy();
      expect(mockHandler).toBeCalled();
    });

    test('checks admin status when handling command', () => {
      const zone = buildZone();
      const room = buildRoom(zone, 'testRoom');
      const invoker = buildCharacter(zone, 'invoker', room);
      const handler = buildCommandHandler();
      const mockHandler = jest.fn();
      const definition = { name: 'command', admin: true, handler: mockHandler };
      handler.registerCommand(definition);
      expect(handler.handleCommand(invoker, 'command', undefined)).toBeFalsy();
      expect(mockHandler).not.toBeCalled();

      const admin = buildCharacter(zone, 'invoker', room, { admin: true });
      expect(handler.handleCommand(admin, 'command', undefined)).toBeTruthy();
      expect(mockHandler).toBeCalled();
    });

    test('checks balance state when handling command', () => {
      const zone = buildZone();
      const room = buildRoom(zone, 'testRoom');
      const invoker = buildCharacter(zone, 'invoker', room);
      const handler = buildCommandHandler();
      const mockHandler = jest.fn();
      const definition = { name: 'command', requiresBalance: true, handler: mockHandler };
      handler.registerCommand(definition);
      invoker.balancedAt = Date.now() + 2000;
      expect(handler.handleCommand(invoker, 'command', undefined)).toBeTruthy();
      expect(mockHandler).not.toBeCalled();

      invoker.balancedAt = undefined;
      expect(handler.handleCommand(invoker, 'command', undefined)).toBeTruthy();
      expect(mockHandler).toBeCalled();
    });

    test('treats false response from handler as non-handled command', () => {
      const zone = buildZone();
      const room = buildRoom(zone, 'testRoom');
      const invoker = buildCharacter(zone, 'invoker', room);
      const handler = buildCommandHandler();
      const mockHandler = jest.fn().mockReturnValue(false);
      const definition = { name: 'command', handler: mockHandler };
      handler.registerCommand(definition);
      expect(handler.handleCommand(invoker, 'command', undefined)).toBeFalsy();
      expect(mockHandler).toBeCalled();
    });
  });
});
