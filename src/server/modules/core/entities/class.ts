export enum ClassType {
  NONE = 'NONE',
  BARBARIAN = 'BARBARIAN',
  BARD = 'BARD',
  CLERIC = 'CLERIC',
  DRUID = 'DRUID',
  FIGHTER = 'FIGHTER',
  MONK = 'MONK',
  PALADIN = 'PALADIN',
  RANGER = 'RANGER',
  ROGUE = 'ROGUE',
  SORCERER = 'SORCERER',
  WARLOCK = 'WARLOCK',
  WIZARD = 'WIZARD',
}

export interface IClass {
  type: ClassType;
  display: string;
  hitDie: string;
  npcOnly?: boolean;
}

export const NoneClass: IClass = {
  type: ClassType.NONE,
  display: 'None',
  hitDie: '1d0',
  npcOnly: true,
};

export const BarbarianClass: IClass = {
  type: ClassType.BARBARIAN,
  display: 'Barbarian',
  hitDie: '1d12',
};

export const BardClass: IClass = {
  type: ClassType.BARD,
  display: 'Bard',
  hitDie: '1d8',
};

export const ClericClass: IClass = {
  type: ClassType.CLERIC,
  display: 'Cleric',
  hitDie: '1d8',
};

export const DruidClass: IClass = {
  type: ClassType.DRUID,
  display: 'Druid',
  hitDie: '1d8',
};

export const FighterClass: IClass = {
  type: ClassType.FIGHTER,
  display: 'Fighter',
  hitDie: '1d10',
};

export const MonkClass: IClass = {
  type: ClassType.MONK,
  display: 'Monk',
  hitDie: '1d8',
};

export const PaladinClass: IClass = {
  type: ClassType.PALADIN,
  display: 'Paladin',
  hitDie: '1d10',
};

export const RangerClass: IClass = {
  type: ClassType.RANGER,
  display: 'Ranger',
  hitDie: '1d10',
};

export const RogueClass: IClass = {
  type: ClassType.ROGUE,
  display: 'Rogue',
  hitDie: '1d8',
};

export const SorcererClass: IClass = {
  type: ClassType.SORCERER,
  display: 'Sorcerer',
  hitDie: '1d6',
};

export const WarlockClass: IClass = {
  type: ClassType.WARLOCK,
  display: 'Warlock',
  hitDie: '1d8',
};

export const WizardClass: IClass = {
  type: ClassType.WIZARD,
  display: 'Wizard',
  hitDie: '1d6',
};

export const Classes: Record<ClassType, IClass> = {
  NONE: NoneClass,
  BARBARIAN: BarbarianClass,
  BARD: BardClass,
  CLERIC: ClericClass,
  DRUID: DruidClass,
  FIGHTER: FighterClass,
  MONK: MonkClass,
  PALADIN: PaladinClass,
  RANGER: RangerClass,
  ROGUE: RogueClass,
  SORCERER: SorcererClass,
  WARLOCK: WarlockClass,
  WIZARD: WizardClass,
};
