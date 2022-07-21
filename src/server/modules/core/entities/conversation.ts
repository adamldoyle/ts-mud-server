import { v4 } from 'uuid';
import { Character } from './character';

export interface IConversationScheduledCommand {
  character: Character;
  time: number;
  command: string;
}

export class Conversation {
  id: string;
  characters: Character[];
  scheduledCommand?: ReturnType<typeof setTimeout>;
  subConversation?: Conversation;
  parentConversation?: Conversation;
  endConversationCallback?: (data?: any) => void;

  constructor(characters: Character[], endConversationCallback?: (data?: any) => void) {
    this.id = v4();
    this.characters = characters;
    characters.forEach((character) => {
      character.conversation = this;
    });
    this.scheduledCommand = undefined;
    this.endConversationCallback = endConversationCallback;
  }

  scheduleCommand(command: IConversationScheduledCommand) {
    this.clearCommand();
    this.scheduledCommand = setTimeout(() => {
      this.scheduledCommand = undefined;
      command.character.sendCommand(command.command);
    }, command.time * 1000);
  }

  clearCommand() {
    if (this.scheduledCommand) {
      clearTimeout(this.scheduledCommand);
      this.scheduledCommand = undefined;
    }
  }

  handleCommand(invoker: Character, rawInput: string): boolean {
    // Override this in your conversations
    return false;
  }

  handleConversationCommand(invoker: Character, rawInput: string): boolean {
    // Probably leave this one alone
    if (this.subConversation) {
      return this.subConversation.handleConversationCommand(invoker, rawInput);
    }
    return this.handleCommand(invoker, rawInput);
  }

  startSubConversation(subConversation: Conversation) {
    this.subConversation = subConversation;
    subConversation.parentConversation = this;
  }

  returnToConversation(data?: any) {}

  endConversation(data?: any) {
    this.characters.forEach((character) => {
      character.conversation = this.parentConversation ?? undefined;
    });
    if (this.parentConversation) {
      this.parentConversation.subConversation = undefined;
      this.parentConversation.returnToConversation(data);
    } else if (this.endConversationCallback) {
      this.endConversationCallback(data);
    }
  }

  removeFromConversation(character: Character) {
    this.characters = this.characters.filter((other) => other !== character);
    character.conversation = undefined;
  }

  tick(invoker: Character, tickCounter: number): boolean {
    if (this.subConversation) {
      return this.subConversation.tick(invoker, tickCounter);
    }
    return false;
  }
}
