import { flagUtils, stringUtils } from '@core/utils';
import { calculateTime, TimeOfDay } from '@modules/calendar';
import { buildCommandHandler, ICommandDefinition, ICommandHandler } from '@core/commands/CommandHandler';
import { Zone, BaseKeyedEntity, buildZonedKey } from './zone';
import { Character, ICharacterDefinition, ICharacterResetsDefinition } from './character';
import { ItemContainer, IItemResetsDefinition } from './item';
import { stripColors } from '@shared/color';
import { logger } from '@shared/Logger';
import { Instance } from '@server/GameServerInstance';

export const DIRECTION_OPPOSITES: Record<string, string> = {
  north: 'south',
  south: 'north',
  west: 'east',
  east: 'west',
  up: 'down',
  down: 'up',
  northeast: 'southwest',
  northwest: 'southeast',
  southwest: 'northeast',
  southeast: 'northwest',
};
export const DIRECTION_ALIASES: Record<string, string> = {
  n: 'north',
  s: 'south',
  w: 'west',
  e: 'east',
  u: 'up',
  d: 'down',
  ne: 'northeast',
  nw: 'northwest',
  sw: 'southwest',
  se: 'southeast',
};

export enum ExitFlag {
  NOMOB = 1 << 0,
  DOOR = 1 << 1,
  CLOSED = 1 << 2,
  SECRET = 1 << 3,
}

export interface IExitDefinition {
  direction: string;
  destination: string;
  flags?: ExitFlag[] | flagUtils.FlagsType;
}

export class Exit {
  definition: IExitDefinition;
  direction: string;
  origin: Room;
  destination: Room;
  flags: flagUtils.Flags<ExitFlag>;

  constructor(definition: IExitDefinition, origin: Room) {
    this.definition = definition;
    this.direction = definition.direction;
    this.origin = origin;
    this.flags = new flagUtils.Flags(definition.flags);
    const destination = Instance.gameServer?.catalog.lookupRoom(definition.destination, this.origin.zone);
    if (!destination) {
      throw new Error(`Unknown exit from ${this.origin.key}`);
    }
    this.destination = destination;
  }

  canView(char: Character): boolean {
    return !this.flags.hasFlag(ExitFlag.SECRET);
  }

  isClosed(): boolean {
    return this.flags.hasFlag(ExitFlag.CLOSED);
  }

  open(char: Character): boolean {
    if (!this.canOpen(char)) {
      return false;
    }
    this.flags.removeFlag(ExitFlag.CLOSED);
    return true;
  }

  close(char: Character): boolean {
    if (!this.canClose(char)) {
      return false;
    }
    this.flags.addFlag(ExitFlag.CLOSED);
    return true;
  }

  canOpen(char: Character): boolean {
    if (!this.isCloseableOrOpenable(char)) {
      return false;
    }
    if (!this.isClosed()) {
      return false;
    }
    return true;
  }

  canClose(char: Character): boolean {
    if (!this.isCloseableOrOpenable(char)) {
      return false;
    }
    if (this.isClosed()) {
      return false;
    }
    return true;
  }

  private isCloseableOrOpenable(char: Character) {
    if (!this.flags.hasFlag(ExitFlag.DOOR)) {
      return false;
    }
    if (!char.npc) {
      return true;
    }
    if (this.flags.hasFlag(ExitFlag.NOMOB)) {
      return false;
    }
    return true;
  }

  canPass(char: Character) {
    if (this.isClosed()) {
      return false;
    }
    if (!char.npc) {
      return true;
    }
    if (this.flags.hasFlag(ExitFlag.NOMOB)) {
      return false;
    }
    return true;
  }

  canPeek(char: Character) {
    if (!this.canView(char) || this.isClosed()) {
      return false;
    }
    return true;
  }

  lookAt(looker: Character) {
    let direction = this.direction;
    if (this.isClosed()) {
      direction = `[${direction}]`;
    }
    return `  - <y>${direction.padStart(12)}<n> :: ${this.destination.name}${looker.admin ? ` [${this.destination.key}]` : ''}`;
  }
}

export interface IResetsDefinition {
  characters?: ICharacterResetsDefinition[];
  items?: IItemResetsDefinition[];
}

export enum RoomFlag {
  SENTINEL = 1 << 0,
  SAFE = 1 << 1,
  NOMOB = 1 << 2,
}

export interface IRoomDefinition {
  key: string;
  roomName: string;
  description: string;
  exits: IExitDefinition[];
  resets?: IResetsDefinition;
  commands?: ICommandDefinition[];
  flags?: RoomFlag[] | flagUtils.FlagsType;
  tick?: (room: Room, tickCounter: number) => boolean | undefined;
}

export interface ISavedRoomDefinition extends IRoomDefinition {
  characters: ICharacterDefinition[];
  items: IItemResetsDefinition[];
}

export class Room extends ItemContainer(BaseKeyedEntity) {
  definition: IRoomDefinition;
  name: string;
  styledName: string;
  description: string;
  exits: Record<string, Exit>;
  flags: flagUtils.Flags<RoomFlag>;
  characters: Character[];
  commandHandler?: ICommandHandler;

  constructor(definition: IRoomDefinition, zone: Zone) {
    super();
    this.initializeKeyedEntity(definition.key, zone);
    definition.key = this.key;
    this.definition = definition;
    this.name = definition.roomName;
    this.styledName = `<g>${this.name}<n>`;
    this.description = definition.description;
    this.flags = new flagUtils.Flags(definition.flags);
    this.exits = {};
    this.characters = [];
    if ((definition.commands?.length ?? 0) > 0) {
      this.commandHandler = buildCommandHandler();
      definition.commands?.forEach((commandDefinition) => {
        this.commandHandler?.registerCommand(commandDefinition);
      });
    }
    zone.addRoom(this);
  }

  finalize(savedRoom?: ISavedRoomDefinition) {
    this.definition.exits.forEach((exitDefinition) => {
      if (this.exits[exitDefinition.direction]) {
        throw new Error(`Exit direction collision in: ${this.key}`);
      }
      try {
        const exit = new Exit(exitDefinition, this);
        this.exits[exit.direction] = exit;
      } catch (err) {
        logger.error(err);
      }
    });

    savedRoom?.characters.forEach((savedCharacterDefinition) => {
      const characterDefinition = Instance.gameServer?.catalog.lookupCharacterDefinition(savedCharacterDefinition.key, this.zone);
      const mergedDefinition: ICharacterDefinition = {
        ...(characterDefinition ?? {}),
        ...savedCharacterDefinition,
        commands: characterDefinition?.commands,
      };
      const character = new Character(mergedDefinition, this.zone, this);
      character.finalize();
    });

    savedRoom?.items.forEach((savedItemDefinition) => {
      const itemDefinition = Instance.gameServer?.catalog.lookupItemDefinition(savedItemDefinition.key, this.zone);
      if (itemDefinition) {
        const item = Instance.gameServer?.catalog.loadItem(itemDefinition.key, this.zone, savedItemDefinition);
        if (item) {
          this.addItem(item);
        }
      }
    });
  }

  canEnter(char: Character): boolean {
    return !char.npc || !this.flags.hasFlag(RoomFlag.NOMOB);
  }

  canWanderInto(char: Character): boolean {
    if (!this.canEnter(char)) {
      return false;
    }
    if (!char.npc) {
      return true;
    }
    return !this.flags.hasFlag(RoomFlag.SENTINEL);
  }

  lookAt(looker: Character) {
    let exitBuffer = Object.values(this.exits)
      .filter((exit) => exit.canView(looker))
      .map((exit) => exit.lookAt(looker))
      .join('\n');
    let charBuffer = this.characters
      .filter((character) => character !== looker)
      .map((character) => character.roomLookAt(looker))
      .filter((description) => description)
      .join(' ');
    let itemBuffer = this.items
      .map((item) => item.roomLookAt(looker))
      .filter((description) => description)
      .join(' ');
    if (exitBuffer.length > 0) {
      exitBuffer = `\n${exitBuffer}`;
    }
    if (charBuffer.length > 0) {
      charBuffer = `\n${charBuffer}`;
    }
    if (itemBuffer.length > 0) {
      itemBuffer = `\n${itemBuffer}`;
    }
    const title = looker.admin ? `[${this.key}] ${this}` : `${this}`;
    const strippedTitle = stripColors(title);
    return `\n${title}\n<B>${'-'.repeat(strippedTitle.length)}\n<n>${this.description}${exitBuffer}${itemBuffer}${charBuffer}`;
  }

  addCharacter(character: Character) {
    if (character.room) {
      character.room.removeCharacter(character);
    }
    this.zone.addCharacter(character);
    this.characters.push(character);
    character.room = this;
  }

  removeCharacter(character: Character) {
    this.zone.removeCharacter(character);
    this.characters = this.characters.filter((otherChar) => otherChar !== character);
    // We're not resetting the character's room attribute since they have to be somewhere
  }

  emitTo(message: string, exclude: Character[] = []) {
    this.characters.forEach((character) => {
      if (!exclude.includes(character)) {
        character.emitTo(message);
      }
    });
  }

  reset() {
    const timeOfDay = calculateTime().timeOfDay;
    this.definition.resets?.characters?.forEach((resetDefinition) => {
      const key = buildZonedKey(resetDefinition.key, this.zone);
      const matches = resetDefinition.dontCheckWholeZone
        ? this.characters.filter((character) => character.key === key)
        : this.zone.characters.filter((character) => character.key === key);
      const shouldExist = !resetDefinition.times || resetDefinition.times.includes(timeOfDay);
      if (shouldExist && matches.length === 0) {
        const character = Instance.gameServer?.catalog.loadCharacter(key, this.zone, this);
        if (character) {
          character.finalize();
          if (resetDefinition.creationMessage) {
            character.room.emitTo(resetDefinition.creationMessage);
          }
        }
      } else if (!shouldExist && matches.length > 0) {
        matches.forEach((match) => {
          match.room.removeCharacter(match);
          if (resetDefinition.destructionMessage) {
            match.room.emitTo(resetDefinition.destructionMessage);
          }
        });
      }
    });

    this.definition.resets?.items?.forEach((resetDefinition) => {
      const key = buildZonedKey(resetDefinition.key, this.zone);
      const matches = this.items.filter((item) => item.key === key);
      if (matches.length === 0) {
        const item = Instance.gameServer?.catalog.loadItem(key, this.zone, resetDefinition);
        if (item) {
          this.addItem(item);
        }
      }
    });
  }

  tick(tickCounter: number) {
    if (this.definition.tick?.(this, tickCounter)) {
      return;
    }
  }

  newTimeOfDay(timeOfDay: TimeOfDay) {}

  toJson(): ISavedRoomDefinition {
    const exits: IExitDefinition[] = Object.values(this.exits).map((exit) => ({
      direction: exit.direction,
      destination: exit.destination.key,
      flags: exit.flags.flags,
    }));
    const characters = this.characters.filter((character) => character.npc).map((character) => character.toJson());
    const items = this.items.map((item) => item.toJson());

    return { ...this.definition, roomName: this.name, description: this.description, exits, characters, items };
  }

  toString() {
    return this.styledName;
  }
}

export interface Path {
  current: Room;
  end: Room;
  exits: Exit[];
}
