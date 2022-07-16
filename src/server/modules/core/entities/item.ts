import { v4 } from 'uuid';
import { stringUtils } from '@core/utils';
import { Constructor } from './base';
import { BaseKeyedEntity, Zone } from './zone';
import { Character } from './character';
import { catalog } from './catalog';

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
      this.items.push(item);
    }

    removeItem(item: Item) {
      if (item.container !== this) {
        return;
      }
      item.container = undefined;
      this.items = this.items.filter((other) => other !== item);
    }

    lookAtInventory(looker: Character) {
      const buffer = this.items.map((item) => `  ${item}`).join('\n');
      return `Inventory:\n${buffer || '  nothing'}`;
    }
  };
}

export interface IItemResetsDefinition extends Partial<IItemDefinition> {
  key: string;
}

export interface IItemDefinition {
  key: string;
  name: string;
  roomDescription?: string;
  description?: string;
  keywords?: string[];
  modifications?: Record<string, string>;
  carryable?: boolean;
  workingData?: Record<string, any>;
  inventory?: IItemResetsDefinition[];
  holdsItems?: boolean;
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
  modifications?: Record<string, string>;
  workingData: Record<string, any>;

  constructor(definition: IItemDefinition, zone: Zone) {
    super();
    this.initializeKeyedEntity(definition.key, zone);
    this.id = v4();
    this.definition = definition;
    this.modifications = definition.modifications ?? {};
    this.name = applyModifications(definition.name, this.modifications);
    this.styledName = `<y>${stringUtils.capitalize(this.name)}<n>`;
    this.roomDescription = definition.roomDescription ?? `${this} is on the ground here.`;
    this.description = definition.description ?? `You see ${this}.`;
    this.finalizeDescriptions();
    this.keywords = definition.keywords?.map((keyword) => keyword.toLowerCase()) ?? [];
    this.container = undefined;
    this.workingData = definition.workingData ?? {};
  }

  finalizeDescriptions() {
    this.roomDescription = applyModifications(this.roomDescription ?? `${this} is on the ground here.`, this.modifications);
    this.description = applyModifications(this.description ?? `You see ${this}.`, this.modifications);
  }

  finalize() {
    this.definition.inventory?.forEach((invDefinition) => {
      const item = catalog.loadItem(invDefinition.key, this.zone, invDefinition);
      if (item) {
        this.addItem(item);
      }
    });
  }

  emitTo(message: string) {
    return;
  }

  lookAt(looker: Character) {
    const title = `${this}`;
    const inventory = this.canHoldItems() ? this.lookAtInventory(looker) : undefined;
    return `${title}${looker.admin ? ` [${this.key}]` : ''}\n${this.description}${inventory ? `\n\n${inventory}` : ''}`;
  }

  roomLookAt(looker: Character) {
    return this.roomDescription;
  }

  canCarry(): boolean {
    return this.definition.carryable !== false;
  }

  canHoldItems(): boolean {
    return this.definition.holdsItems ?? false;
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
