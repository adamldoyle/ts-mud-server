import { buildCharacter, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from './character';
import { Conversation } from './conversation';

jest.useFakeTimers();

describe('core/entities/conversation', () => {
  let char1: Character;
  let char2: Character;

  beforeEach(() => {
    initializeTestServer();
    const zone = buildZone();
    const room = buildRoom(zone, 'room');
    char1 = buildCharacter(zone, 'char1', room);
    char2 = buildCharacter(zone, 'char2', room);
  });

  describe('Conversation', () => {
    describe('constructor', () => {
      test('adds conversation for each character', () => {
        const conversation = new Conversation([char1, char2]);
        expect(conversation.characters).toEqual([char1, char2]);
        expect(char1.conversation).toEqual(conversation);
        expect(char2.conversation).toEqual(conversation);
      });
    });

    describe('scheduleCommand', () => {
      test('sends command after delay', () => {
        const conversation = new Conversation([char1]);
        conversation.scheduleCommand({ command: 'scheduledtest', time: 3, character: char1 });
        jest.advanceTimersByTime(2500);
        expect(char1.sendCommand).not.toBeCalled();
        jest.advanceTimersByTime(500);
        expect(char1.sendCommand).toBeCalledWith('scheduledtest');
      });

      test('clears existing scheduled command', () => {
        const conversation = new Conversation([char1]);
        conversation.scheduleCommand({ command: 'scheduledtest', time: 3, character: char1 });
        jest.advanceTimersByTime(2500);
        expect(char1.sendCommand).not.toBeCalled();
        conversation.scheduleCommand({ command: 'scheduledtest2', time: 3, character: char1 });
        jest.advanceTimersByTime(2500);
        expect(char1.sendCommand).not.toBeCalled();
        jest.advanceTimersByTime(500);
        expect(char1.sendCommand).toBeCalledWith('scheduledtest2');
      });
    });

    describe('clearCommand', () => {
      test('clears existing scheduled command', () => {
        const conversation = new Conversation([char1]);
        conversation.scheduleCommand({ command: 'scheduledtest', time: 3, character: char1 });
        conversation.clearCommand();
        jest.advanceTimersByTime(3500);
        expect(char1.sendCommand).not.toBeCalled();
      });
    });

    describe('handleCommand', () => {
      test('returns false always', () => {
        const conversation = new Conversation([char1]);
        expect(conversation.handleCommand(char1, 'testcommand')).toBeFalsy();
      });
    });

    describe('startSubConversation', () => {
      test('attaches child conversation to parent conversation', () => {
        const parent = new Conversation([char1]);
        const child = new Conversation([char1]);
        parent.startSubConversation(child);
        expect(parent.subConversation).toEqual(child);
        expect(child.parentConversation).toEqual(parent);
      });
    });

    describe('handleConversationCommand', () => {
      test('calls handleCommand on conversation', () => {
        const conversation = new Conversation([char1]);
        jest.spyOn(conversation, 'handleCommand');
        expect(conversation.handleConversationCommand(char1, 'testcommand')).toBeFalsy();
        expect(conversation.handleCommand).toBeCalledWith(char1, 'testcommand');
      });

      test('calls into child conversation if one set', () => {
        const parent = new Conversation([char1]);
        const child = new Conversation([char1]);
        parent.startSubConversation(child);
        jest.spyOn(parent, 'handleCommand');
        jest.spyOn(child, 'handleCommand');
        expect(parent.handleConversationCommand(char1, 'testcommand')).toBeFalsy();
        expect(child.handleCommand).toBeCalledWith(char1, 'testcommand');
        expect(parent.handleCommand).not.toBeCalled();
      });
    });

    describe('endConversation', () => {
      test('unsets conversation for each character involved', () => {
        const conversation = new Conversation([char1, char2]);
        expect(conversation.characters).toEqual([char1, char2]);
        expect(char1.conversation).toEqual(conversation);
        expect(char2.conversation).toEqual(conversation);
        conversation.endConversation();
        expect(char1.conversation).toBeUndefined();
        expect(char2.conversation).toBeUndefined();
      });

      test(`unsets parent's child conversation if child ended`, () => {
        const parent = new Conversation([char1]);
        const child = new Conversation([char1]);
        parent.startSubConversation(child);
        child.endConversation();
        expect(parent.subConversation).toBeUndefined();
      });

      test(`calls returnToConversation on parent if child ended`, () => {
        const parent = new Conversation([char1]);
        const child = new Conversation([char1]);
        parent.startSubConversation(child);
        jest.spyOn(parent, 'returnToConversation');
        child.endConversation({ testData: true });
        expect(parent.returnToConversation).toBeCalledWith({ testData: true });
      });

      test(`calls endConversationCallback if set and not a child`, () => {
        const endConversationCallback = jest.fn();
        const parent = new Conversation([char1], endConversationCallback);
        parent.endConversation({ testData: true });
        expect(endConversationCallback).toBeCalledWith({ testData: true });
      });

      test(`does not call endConversationCallback if child`, () => {
        const endConversationCallback = jest.fn();
        const parent = new Conversation([char1]);
        const child = new Conversation([char1], endConversationCallback);
        parent.startSubConversation(child);
        child.endConversation();
        expect(endConversationCallback).not.toBeCalled();
      });
    });

    describe('removeFromConversation', () => {
      test('removes single character from conversation', () => {
        const conversation = new Conversation([char1, char2]);
        conversation.removeFromConversation(char1);
        expect(char1.conversation).toBeUndefined();
        expect(char2.conversation).toEqual(conversation);
        expect(conversation.characters).toEqual([char2]);
      });
    });

    describe('tick', () => {
      test('returns false by default', () => {
        const conversation = new Conversation([char1, char2]);
        expect(conversation.tick(char1, 27)).toBeFalsy();
      });

      test('calls tick on child conversation if set', () => {
        const parent = new Conversation([char1]);
        const child = new Conversation([char1]);
        parent.startSubConversation(child);
        jest.spyOn(child, 'tick');
        expect(parent.tick(char1, 27)).toBeFalsy();
        expect(child.tick).toBeCalledWith(char1, 27);
      });
    });
  });
});
