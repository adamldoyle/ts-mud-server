import deepEqual from 'deep-equal';
import { v4 } from 'uuid';
import { Constructor } from './base';
import { BaseKeyedEntity, Zone } from './zone';
import { Character } from './character';
import { getCatalogSafely } from '@server/GameServerInstance';
import * as flagUtils from '../utils/flagUtils';
import { BodyPosition } from './equipment';

export interface IItemContainer {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (item: Item) => void;
  lookAtInventory: (looker: Character) => string;
}

// An item container is anything that can have items "in" it, e.g. a room, character, another item.
export function ItemContainer<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    items: Item[] = [];

    addItem(item: Item) {
      if (item.container) {
        item.container.items = item.container.items.filter((other) => other !== item);
      }
      item.container = this;
      const existingIndex = this.items.findIndex((other) => item.isSameItem(other));
      if (existingIndex !== -1) {
        this.items.splice(existingIndex, 0, item);
      } else {
        this.items.push(item);
      }
    }

    removeItem(item: Item) {
      if (item.container !== this) {
        return;
      }
      item.container = undefined;
      this.items = this.items.filter((other) => other !== item);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lookAtInventory(looker: Character) {
      const buffer = this.items
        .reduce<[Item, number][]>((acc, item) => {
          const existing = acc.find(([other]) => item.isSameItem(other));
          if (existing) {
            existing[1]++;
          } else {
            acc.push([item, 1]);
          }
          return acc;
        }, [])
        .map(([item, qty]) => `  ${qty > 1 ? `(x${qty}) ` : ``}${item}`)
        .join('\n');
      return `Inventory:\n${buffer || '  nothing'}`;
    }
  };
}

export interface IItemResetsDefinition extends Partial<IItemDefinition> {
  key: string;
}

export enum ItemFlag {
  NOCARRY = 1 << 0,
  CONTAINER = 1 << 1,
  WEARABLE = 1 << 2,
}

export interface IItemDefinition {
  key: string;
  name: string;
  roomDescription?: string;
  description?: string;
  keywords?: string[];
  modifications?: Record<string, string>;
  workingData?: Record<string, unknown>;
  inventory?: IItemResetsDefinition[];
  flags?: ItemFlag[] | flagUtils.FlagsType;
  wearSpots?: BodyPosition[];
}

export const applyModifications = (text: string, modifications?: Record<string, string>) => {
  let newText = text;
  Object.entries(modifications ?? []).forEach((entry) => {
    newText = newText.replace(new RegExp(`{${entry[0]}}`, 'g'), entry[1]);
  });
  return newText;
};

export class Item extends ItemContainer(BaseKeyedEntity) {
  definition: IItemDefinition;
  id: string;
  name: string;
  styledName: string;
  roomDescription: string;
  description: string;
  keywords: string[];
  container?: IItemContainer;
  modifications: Record<string, string>;
  workingData: Record<string, unknown>;
  flags: flagUtils.Flags<ItemFlag>;

  constructor(definition: IItemDefinition, zone: Zone) {
    super();
    this.initializeKeyedEntity(definition.key, zone);
    this.id = v4();
    this.definition = definition;
    this.modifications = definition.modifications ?? {};
    this.name = definition.name;
    this.styledName = `<y>${this.name}<n>`;
    this.roomDescription = definition.roomDescription ?? `${this} is on the ground here.`;
    this.description = definition.description ?? `You see ${this}.`;
    this.keywords = definition.keywords?.map((keyword) => keyword.toLowerCase()) ?? [];
    this.container = undefined;
    this.workingData = definition.workingData ?? {};
    this.flags = new flagUtils.Flags(definition.flags);
    this.applyItemModifications();
  }

  applyItemModifications() {
    this.name = applyModifications(this.name, this.modifications);
    this.styledName = applyModifications(this.styledName, this.modifications);
    this.roomDescription = applyModifications(this.roomDescription, this.modifications);
    this.description = applyModifications(this.description, this.modifications);
  }

  finalize() {
    this.definition.inventory?.forEach((invDefinition) => {
      const item = getCatalogSafely().loadItem(invDefinition.key, this.zone, invDefinition);
      if (item) {
        this.addItem(item);
      }
    });
  }

  lookAt(looker: Character) {
    const title = `${this}`;
    const inventory = this.canHoldItems() ? this.lookAtInventory(looker) : undefined;
    return `${title}${looker.admin ? ` [${this.key}]` : ''}\n${this.description}${inventory ? `\n\n${inventory}` : ''}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roomLookAt(looker: Character) {
    return this.roomDescription;
  }

  canCarry(): boolean {
    return !this.flags.hasFlag(ItemFlag.NOCARRY);
  }

  canHoldItems(): boolean {
    return this.flags.hasFlag(ItemFlag.CONTAINER);
  }

  isSameItem(other: Item): boolean {
    return other.key === this.key && deepEqual(other.modifications, this.modifications, { strict: true });
  }

  toJson(): IItemDefinition {
    return {
      ...this.definition,
      modifications: this.modifications,
      workingData: this.workingData,
      keywords: this.keywords,
      description: this.description,
      roomDescription: this.roomDescription,
    };
  }

  toString() {
    return this.styledName;
  }
}

// Match priority = exact key, keywords, key starts with, lowercase key starts with
export const matchItems = (elements: Item[], identifier: string): Item[] => {
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
