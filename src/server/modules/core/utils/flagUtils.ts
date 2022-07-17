export type Flag = number;
export type RawFlags = Flag[];
export type FlagsType = number;

export const mergeFlags = (flags?: RawFlags | FlagsType): Flag => {
  if (!flags) {
    return 0;
  }
  if (Array.isArray(flags)) {
    return (flags ?? []).reduce((acc, flag) => acc | flag, 0);
  }
  return flags;
};

export const hasFlag = (flags: FlagsType, flag: Flag): boolean => {
  return !!(flags & flag);
};

export const addFlag = (flags: FlagsType, flag: Flag): number => {
  return flags | flag;
};

export const removeFlag = (flags: FlagsType, flag: Flag): number => {
  return flags & ~flag;
};

export class Flags<FlagType extends Flag> {
  flags: FlagsType;

  constructor(flags?: FlagType[] | FlagsType) {
    this.flags = mergeFlags(flags);
  }

  hasFlag(flag: FlagType): boolean {
    return hasFlag(this.flags, flag);
  }

  addFlag(flag: FlagType) {
    this.flags = addFlag(this.flags, flag);
  }

  removeFlag(flag: FlagType) {
    this.flags = removeFlag(this.flags, flag);
  }
}
