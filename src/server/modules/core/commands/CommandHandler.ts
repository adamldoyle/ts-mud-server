import { logger } from '@shared/Logger';
import { Character } from '@core/entities/character';
import { parseArguments } from './parseArguments';

export interface ICommandDefinition {
  name: string;
  aliases?: string[];
  admin?: boolean;
  requiresBalance?: boolean;
  handler: (invoker: Character, command: ICommand, origin: any, definition: ICommandDefinition) => boolean | undefined | void;
  data?: Record<string, any>;
}

export interface ICommand {
  rawInput: string;
  command: string;
  rest: string;
  params: string[];
}

export interface ICommandHandler {
  getCommandDefinitions: () => ICommandDefinition[];
  registerCommand: (definition: ICommandDefinition) => void;
  handleCommand: (invoker: Character, rawInput: string, origin: any) => boolean;
}

export const parseInput = (rawInput: string): ICommand => {
  const [first, ...rest] = rawInput.split(' ');
  const cleaned = rest.filter((piece) => piece);
  return {
    rawInput,
    command: first.toLowerCase(),
    rest: cleaned.join(' '),
    params: cleaned,
  };
};

export const buildCommandHandler = (): ICommandHandler => {
  const commandDefinitions: Record<string, ICommandDefinition> = {};

  const registerCommand = (definition: ICommandDefinition) => {
    definition.name = definition.name.toLowerCase();
    const command = definition.name;
    if (commandDefinitions[command]) {
      return logger.error(`Command already registered`, { command });
    }

    commandDefinitions[command] = definition;
    definition.aliases?.forEach((alias) => {
      commandDefinitions[alias] = definition;
    });
  };

  const getCommandDefinitions = () => {
    return Object.entries(commandDefinitions)
      .filter(([commandKey, definition]) => commandKey === definition.name)
      .map(([_, commandDefinition]) => commandDefinition);
  };

  const handleCommand = (invoker: Character, rawInput: string, origin: any): boolean => {
    const command = parseInput(rawInput);
    const commandDefinition = commandDefinitions[command.command];
    if (!commandDefinition || (commandDefinition.admin && !invoker.admin)) {
      return false;
    }

    if (commandDefinition.requiresBalance && !invoker.balanced()) {
      invoker.emitTo(`Unbalanced for ${invoker.balancedIn()}s...`);
      return true;
    }

    const response = commandDefinition.handler(invoker, command, commandDefinition, origin);
    // False returned if message should be treated as unhandled
    if (response === false) {
      return false;
    }
    return true;
  };

  return {
    commandDefinitions,
    getCommandDefinitions,
    registerCommand,
    handleCommand,
  } as any;
};

export { parseArguments };
