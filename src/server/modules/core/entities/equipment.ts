import { Instance } from '@server/GameServerInstance';
import { logger } from '@shared/Logger';
import { Character } from './character';
import { IItemDefinition, Item, ItemFlag } from './item';

export enum BodyPosition {
  HELD_RIGHT = 'HELD_RIGHT',
  HELD_LEFT = 'HELD_LEFT',
  HEAD = 'HEAD',
  ABOUT = 'ABOUT',
  TORSO = 'TORSO',
  ARMS = 'ARMS',
  HANDS = 'HANDS',
  LEGS = 'LEGS',
  FEET = 'FEET',
}

export interface IBodyPositionData {
  display: string;
}

export const BodyPositionInfo: Record<BodyPosition, IBodyPositionData> = {
  HELD_RIGHT: { display: 'held (right)' },
  HELD_LEFT: { display: 'held (left)' },
  HEAD: { display: 'head' },
  ABOUT: { display: 'about body' },
  TORSO: { display: 'torso' },
  ARMS: { display: 'arms' },
  HANDS: { display: 'hands' },
  LEGS: { display: 'legs' },
  FEET: { display: 'feet' },
};

export interface IEquipmentDefinition extends Partial<IItemDefinition> {
  key: string;
}

export type IEquipment = Record<BodyPosition, Item | undefined>;

export const emptyEquipment = (): IEquipment => ({
  HELD_RIGHT: undefined,
  HELD_LEFT: undefined,
  HEAD: undefined,
  ABOUT: undefined,
  TORSO: undefined,
  ARMS: undefined,
  HANDS: undefined,
  LEGS: undefined,
  FEET: undefined,
});

export const wearItem = (invoker: Character, item: Item, desiredWearSpot?: BodyPosition): [true, BodyPosition] | [false, string] => {
  if (item.container !== invoker || !invoker.items.find((other) => other === item)) {
    return [false, `That's not in your inventory.`];
  }

  if (!item.flags.hasFlag(ItemFlag.WEARABLE) || !item.definition.wearSpots?.length) {
    return [false, `It's not wearable.`];
  }

  if (desiredWearSpot && !item.definition.wearSpots.includes(desiredWearSpot)) {
    return [false, `You can't wear that there.`];
  }

  const wearSpot = (desiredWearSpot ? [desiredWearSpot] : item.definition.wearSpots).find((spot) => !invoker.equipment[spot]);
  if (!wearSpot) {
    return [false, `There's no spot to wear it.`];
  }

  item.container.removeItem(item);
  invoker.equipment[wearSpot] = item;
  item.container = invoker;
  return [true, wearSpot];
};

export const removeItem = (invoker: Character, item: Item): [true, BodyPosition] | [false, string] => {
  if (item.container !== invoker) {
    return [false, `You're not wearing that.`];
  }

  const equipmentEntry = Object.entries(invoker.equipment).find(([, wornItem]) => wornItem === item);
  if (!equipmentEntry || !equipmentEntry[0] || !equipmentEntry[1]) {
    return [false, `You're not wearing that.`];
  }

  const spot = equipmentEntry[0] as BodyPosition;
  invoker.addItem(equipmentEntry[1]);
  invoker.equipment[spot] = undefined;
  return [true, spot];
};

export const buildEquipment = (invoker: Character, definitions?: Partial<Record<BodyPosition, IEquipmentDefinition>>): IEquipment => {
  const catalog = Instance.gameServer?.catalog;
  if (!catalog) {
    throw new Error('Referencing catalog before initialization');
  }
  return Object.entries(definitions ?? {}).reduce((acc, [bodyPosition, definition]) => {
    try {
      const item = catalog.loadItem(definition.key, invoker.zone, definition);
      if (item) {
        invoker.addItem(item);
        wearItem(invoker, item, bodyPosition as BodyPosition);
      }
    } catch (err) {
      logger.error(err);
    }
    return acc;
  }, emptyEquipment());
};

export const lookAtEquipment = (looker: Character, target: Character, excludeEmpty?: boolean) => {
  const entries = Object.entries(target.equipment).filter(([, item]) => !excludeEmpty || item);
  const longestSpot = entries.reduce((acc, [wearSpot]) => {
    return Math.max(acc, BodyPositionInfo[wearSpot as BodyPosition].display.length);
  }, 0);
  const buffer = entries
    .map(([wearSpot, item]) => `  ${BodyPositionInfo[wearSpot as BodyPosition].display.padStart(longestSpot, ' ')}: ${item ?? 'nothing'}`)
    .join('\n');
  return `Equipment:\n${buffer || '  nothing'}`;
};
