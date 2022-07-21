import fs from 'fs';
import { v4 } from 'uuid';
import { Instance } from '@server/GameServerInstance';
import { flagUtils, stringUtils } from '@core/utils';
import { TimeOfDay } from '@modules/calendar';
import { buildCommandHandler, ICommandDefinition, ICommandHandler } from '@core/commands/CommandHandler';
import { Zone, BaseKeyedEntity } from './zone';
import { Room, RoomFlag } from './room';
import { IItemDefinition, ItemContainer } from './item';
import { Conversation } from './conversation';

const PLAYER_SAVE_INTERVAL = 1 * 60 * 1000; // Once a minute

interface IInventoryDefinition extends Partial<IItemDefinition> {
  key: string;
}

export enum CharacterFlag {
  SENTINEL = 1 << 0,
  PACIFISM = 1 << 1,
}

export interface ICharacterDefinition {
  key: string;
  name: string;
  admin?: boolean;
  keywords?: string[];
  roomDescription?: string;
  description?: string;
  inventory?: IInventoryDefinition[];
  flags?: CharacterFlag[] | flagUtils.FlagsType;
  tick?: (character: Character, tickCounter: number) => boolean | undefined;
  commands?: ICommandDefinition[];
  workingData?: Record<string, any>;
}

export interface IPlayerDefinition extends ICharacterDefinition {
  accountId: string;
  room: string;
  playerNumber: number;
}

export interface ICharacterResetsDefinition extends Partial<ICharacterDefinition> {
  key: string;
  creationMessage?: string;
  destructionMessage?: string;
  times?: TimeOfDay[];
  dontCheckWholeZone?: boolean;
}

export interface IDescriptionBundle {
  room: string;
  look: string;
}

export class Character extends ItemContainer(BaseKeyedEntity) {
  definition: ICharacterDefinition;
  id: string;
  name: string;
  admin: boolean;
  npc: boolean;
  styledName: string;
  room!: Room;
  roomDescription: string;
  description: string;
  keywords: string[];
  flags: flagUtils.Flags<CharacterFlag>;
  following?: Character;
  followers: Character[];
  conversation?: Conversation;
  commandHandler?: ICommandHandler;
  workingData: Record<string, any>;
  unbalancedUntil?: number;

  constructor(definition: ICharacterDefinition, zone: Zone, room: Room) {
    super();
    this.initializeKeyedEntity(definition.key, zone);
    this.definition = definition;
    this.id = v4();
    this.key = definition.key;
    this.name = definition.name;
    this.admin = definition.admin ?? false;
    this.npc = !Boolean((definition as IPlayerDefinition).accountId);
    this.styledName = `<${this.admin ? 'Y' : 'c'}>${this.name}<n>`;
    this.roomDescription = definition.roomDescription ?? `${this} is here.`;
    this.description = definition.description ?? `You see ${this}.`;
    this.keywords = definition.keywords?.map((keyword) => keyword.toLowerCase()) ?? [];
    this.following = undefined;
    this.followers = [];
    this.conversation = undefined;
    this.workingData = definition.workingData ?? {};
    this.flags = new flagUtils.Flags(definition.flags);

    if ((definition.commands?.length ?? 0) > 0) {
      this.commandHandler = buildCommandHandler();
      definition.commands?.forEach((commandDefinition) => {
        this.commandHandler?.registerCommand(commandDefinition);
      });
    }
    room.addCharacter(this);
  }

  finalize() {
    this.definition.inventory?.forEach((invDefinition) => {
      const item = Instance.gameServer?.catalog.loadItem(invDefinition.key, this.zone, invDefinition);
      if (item) {
        this.addItem(item);
      }
    });
  }

  changeDescription(descriptionBundle: IDescriptionBundle, permanent: boolean) {
    this.description = descriptionBundle.look;
    this.roomDescription = descriptionBundle.room;
    if (permanent) {
      this.definition.description = descriptionBundle.look;
      this.definition.roomDescription = descriptionBundle.room;
    }
  }

  emitTo(message: string): undefined {
    return;
  }

  lookAt(looker: Character) {
    const title = `${this}`;
    const inventory = this.lookAtInventory(looker);
    return `${title}${looker.admin ? ` [${this.key}]` : ''}\n${this.description}${inventory ? `\n\n${inventory}` : ''}`;
  }

  roomLookAt(looker: Character) {
    return this.roomDescription;
  }

  follow(target: Character) {
    target.emitTo(`${this} is now following you.`);
    this.emitTo(`You are now following ${target}.`);
    this.following = target;
    target.followers.push(this);
  }

  unfollow() {
    if (!this.following) {
      return;
    }

    this.following.emitTo(`${this} is no longer following you.`);
    this.emitTo(`You are no longer following ${this.following}.`);
    this.following.followers = this.following.followers.filter((other) => other.id !== this.id);
    this.following = undefined;
  }

  disband() {
    const currentFollowers = [...this.followers];
    for (let i = 0; i < currentFollowers.length; i++) {
      currentFollowers[i].unfollow();
    }
  }

  balanced() {
    return !this.unbalancedUntil || Date.now() > this.unbalancedUntil;
  }

  balancedIn(): number | undefined {
    if (!this.unbalancedUntil || this.balanced()) {
      return undefined;
    }
    return Math.round((this.unbalancedUntil - Date.now()) / 1000);
  }

  unbalance(seconds: number) {
    const newUnbalancedUntil = Date.now() + seconds * 1000;
    if (newUnbalancedUntil > (this.unbalancedUntil ?? 0)) {
      this.unbalancedUntil = newUnbalancedUntil;
    }
  }

  canWander() {
    if (!this.npc) {
      return false;
    }
    return !this.flags.hasFlag(CharacterFlag.SENTINEL) && !this.room.flags.hasFlag(RoomFlag.SENTINEL);
  }

  save() {}

  tick(tickCounter: number) {
    if (this.definition.tick?.(this, tickCounter)) {
      return;
    }

    if (this.conversation?.tick(this, tickCounter)) {
      return;
    }

    if (this.canWander() && !this.conversation && !this.following) {
      let random = Math.floor(Math.random() * 100);
      if (random < 5) {
        const passableExits = Object.values(this.room.exits).filter(
          (exit) => exit.destination.zone === this.room.zone && exit.canPass(this) && exit.destination.canWanderInto(this)
        );
        if (passableExits.length > 0) {
          random = Math.floor(Math.random() * passableExits.length);
          const exit = passableExits[random];
          this.sendCommand(`move ${exit.direction}`);
        }
      }
    }
  }

  toJson(): ICharacterDefinition {
    const inventory = this.items.map((item) => item.toJson());

    return { ...this.definition, inventory, workingData: this.workingData };
  }

  sendCommand(rawInput: string) {
    Instance.gameServer?.handleCommand(this, rawInput);
  }

  toString() {
    return this.styledName;
  }
}

export class Player extends Character {
  accountId: string;
  lastSave: number;
  constructor(definition: IPlayerDefinition) {
    let room = Instance.gameServer?.catalog.lookupRoom(definition.room);
    if (!room && Instance.gameServer?.config.startingRoom) {
      room = Instance.gameServer?.catalog.lookupRoom(Instance.gameServer?.config.startingRoom);
    }
    if (!room) {
      throw new Error('Unable to place character in room');
    }
    super(definition, room.zone, room);
    this.accountId = definition.accountId;
    this.lastSave = -1;
  }

  finalize(suppressEmit?: boolean) {
    super.finalize();

    if (!suppressEmit) {
      this.emitTo('You appear in a cloud of smoke...');
      this.room.emitTo(`${this} appears in a cloud of smoke...`, [this]);
    }
  }

  disconnect(suppressEmit?: boolean) {
    if (!suppressEmit) {
      this.room.emitTo(`${this} disappears in a cloud of smoke...`, [this]);
    }
    if (this.conversation) {
      this.conversation.endConversation();
    }
    this.unfollow();
    this.disband();
    this.room.removeCharacter(this);
  }

  emitTo(message: string): undefined {
    Instance.gameServer?.sendMessageToCharacter(this.name, message + '\n');
    return;
  }

  tick(tickCounter: number) {
    super.tick(tickCounter);

    if (Date.now() - this.lastSave >= PLAYER_SAVE_INTERVAL) {
      this.save();
    }
  }

  static playerExists(name: string): boolean {
    return fs.existsSync(`data/players/${name.toLowerCase()}.json`);
  }

  static load(name: string): Player | undefined {
    if (!Player.playerExists(name)) {
      return undefined;
    }

    const rawPlayer = fs.readFileSync(`data/players/${name.toLowerCase()}.json`, 'utf-8');
    const playerDefinition = JSON.parse(rawPlayer) as IPlayerDefinition;
    return new Player(playerDefinition);
  }

  save() {
    const json = { ...super.toJson(), room: this.room.key };
    const stringified = JSON.stringify(json, null, 2);
    if (stringified) {
      fs.writeFileSync(`data/players/${this.name.toLowerCase()}.json`, stringified, {
        encoding: 'utf-8',
      });
      this.lastSave = Date.now();
    }
  }
}

// Match priority = exact key, keywords, key starts with, lowercase key starts with
export const matchCharacters = (elements: Character[], identifier: string): Character[] => {
  let matches = elements.filter((target) => target.basicKey.toLowerCase() === identifier.toLowerCase());
  if (matches.length === 0) {
    matches = elements.filter((target) => target.keywords.includes(identifier.toLowerCase()));
  }
  if (matches.length === 0) {
    matches = elements.filter((target) => target.key.toLowerCase().startsWith(identifier.toLowerCase()));
  }
  if (matches.length === 0) {
    matches = elements.filter((target) => target.name.toLowerCase().startsWith(identifier.toLowerCase()));
  }
  return matches;
};
