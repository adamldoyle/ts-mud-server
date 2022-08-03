import { AbilityType } from './abilities';

export enum RaceType {
  HUMANOID = 'HUMANOID',
  DRAGONBORN = 'DRAGONBORN',
  DWARF = 'DWARF',
  ELF = 'ELF',
  GNOME = 'GNOME',
  HALFLING = 'HALFLING',
  HALF_ORC = 'HALF_ORC',
  HUMAN = 'HUMAN',
  TIEFLING = 'TIEFLING',
}

export interface IRace {
  type: RaceType;
  display: string;
  abilityModifiers: Partial<Record<AbilityType, number>>;
  npcOnly?: boolean;
}

export const HumanoidRace: IRace = {
  type: RaceType.HUMANOID,
  display: 'Humanoid',
  abilityModifiers: {},
  npcOnly: true,
};

export const DragonbornRace: IRace = {
  type: RaceType.DRAGONBORN,
  display: 'Dragonborn',
  abilityModifiers: {
    STRENGTH: 2,
    CHARISMA: 1,
  },
};

export const DwarfRace: IRace = {
  type: RaceType.DWARF,
  display: 'Dwarf',
  abilityModifiers: {
    CONSTITUTION: 2,
    STRENGTH: 2, // Mountain dwarf
  },
};

export const ElfRace: IRace = {
  type: RaceType.ELF,
  display: 'Elf',
  abilityModifiers: {
    DEXTERITY: 2,
    WISDOM: 1, // Wood elf
  },
};

export const GnomeRace: IRace = {
  type: RaceType.GNOME,
  display: 'Gnome',
  abilityModifiers: {
    INTELLIGENCE: 2,
    CONSTITUTION: 1, // Rock gnome
  },
};

export const HalflingRace: IRace = {
  type: RaceType.HALFLING,
  display: 'Halfling',
  abilityModifiers: {
    DEXTERITY: 2,
    CHARISMA: 1, // Lightfoot halfling
  },
};

export const HalfOrcRace: IRace = {
  type: RaceType.HALF_ORC,
  display: 'Half-Orc',
  abilityModifiers: {
    STRENGTH: 2,
    CONSTITUTION: 1,
  },
};

export const HumanRace: IRace = {
  type: RaceType.HUMAN,
  display: 'Human',
  abilityModifiers: {
    STRENGTH: 1,
    DEXTERITY: 1,
    CONSTITUTION: 1,
    INTELLIGENCE: 1,
    WISDOM: 1,
    CHARISMA: 1,
  },
};

export const TieflingRace: IRace = {
  type: RaceType.TIEFLING,
  display: 'Tiefling',
  abilityModifiers: {
    CHARISMA: 2,
    INTELLIGENCE: 1,
  },
};

export const Races: Record<RaceType, IRace> = {
  HUMANOID: HumanoidRace,
  DRAGONBORN: DragonbornRace,
  DWARF: DwarfRace,
  ELF: ElfRace,
  GNOME: GnomeRace,
  HALFLING: HalflingRace,
  HALF_ORC: HalfOrcRace,
  HUMAN: HumanRace,
  TIEFLING: TieflingRace,
};
