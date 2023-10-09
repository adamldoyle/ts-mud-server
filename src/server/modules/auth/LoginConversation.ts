import fs from 'fs';
import { ISavedAccount } from '@shared/types';
import { saveAccount } from '@shared/account';
import { getGameServerSafely } from '@server/GameServerInstance';
import { IPlayerDefinition, Player } from '@core/entities/character';
import { stringUtils } from '@core/utils';
import { Races, RaceType } from '@core/entities/race';
import { Classes, ClassType } from '@core/entities/class';
import { AbilityType, defaultAbilities, IAbilities } from '@core/entities/abilities';

const ABILITY_VALUES = [15, 14, 13, 12, 10, 8];

enum ConversationStateType {
  CHARACTER_PROMPT,
  NEW_CHARACTER_NAME_PROMPT,
  NEW_CHARACTER_NAME_CONFIRM,
  NEW_CHARACTER_RACE,
  NEW_CHARACTER_CLASS,
  NEW_CHARACTER_ABILITIES,
  NEW_CHARACTER_CONFIRM,
  COMPLETE,
}

interface CharacterPromptState {
  type: ConversationStateType.CHARACTER_PROMPT;
  account: ISavedAccount;
}

interface NewCharacterNamePromptState {
  type: ConversationStateType.NEW_CHARACTER_NAME_PROMPT;
  account: ISavedAccount;
}

interface NewCharacterNameConfirmState {
  type: ConversationStateType.NEW_CHARACTER_NAME_CONFIRM;
  account: ISavedAccount;
  characterName: string;
}

interface NewCharacterRaceState {
  type: ConversationStateType.NEW_CHARACTER_RACE;
  account: ISavedAccount;
  characterName: string;
}

interface NewCharacterClassState {
  type: ConversationStateType.NEW_CHARACTER_CLASS;
  account: ISavedAccount;
  characterName: string;
  raceType: RaceType;
}

interface NewCharacterAbilitiesState {
  type: ConversationStateType.NEW_CHARACTER_ABILITIES;
  account: ISavedAccount;
  characterName: string;
  raceType: RaceType;
  classType: ClassType;
  abilities: Partial<Record<AbilityType, number>>;
}

interface NewCharacterConfirmState {
  type: ConversationStateType.NEW_CHARACTER_CONFIRM;
  account: ISavedAccount;
  characterName: string;
  raceType: RaceType;
  classType: ClassType;
  abilities: Record<AbilityType, number>;
}

interface CompleteState {
  type: ConversationStateType.COMPLETE;
  account: ISavedAccount;
  player?: Player;
}

type ConversationState =
  | CharacterPromptState
  | NewCharacterNamePromptState
  | NewCharacterNameConfirmState
  | NewCharacterRaceState
  | NewCharacterClassState
  | NewCharacterAbilitiesState
  | NewCharacterConfirmState
  | CompleteState;

interface SendMessage {
  (message: string): void;
}

const handleCharacterPrompt = (state: CharacterPromptState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  if (!new RegExp('^[0-9]+$').test(rawInput)) {
    sendMessage('Invalid choice, please enter an option number.');
    return state;
  }

  const characterIndex = parseInt(rawInput);
  if (characterIndex < 1 || characterIndex > state.account.characterNames.length + 1) {
    sendMessage('Invalid choice, please enter an option number.');
    return state;
  }

  if (characterIndex > state.account.characterNames.length) {
    sendMessage('Creating a new character...\n\nName:');
    return { ...state, type: ConversationStateType.NEW_CHARACTER_NAME_PROMPT };
  }

  const characterName = state.account.characterNames[characterIndex - 1];
  const player = Player.load(characterName);
  sendMessage(`Assuming place of ${characterName}...`);
  return { ...state, type: ConversationStateType.COMPLETE, player };
};

const handleNewCharacterNamePrompt = (state: NewCharacterNamePromptState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  const newCharacterName = stringUtils.capitalize(rawInput.trim());
  if (Player.playerExists(newCharacterName)) {
    sendMessage('Name already in use. Name:');
    return state;
  }

  sendMessage(`Create new character with name ${newCharacterName}? (Y/N)`);
  return { ...state, type: ConversationStateType.NEW_CHARACTER_NAME_CONFIRM, characterName: newCharacterName };
};

const outputRaces = (): string => {
  const merged = Object.values(Races)
    .filter((race) => !race.npcOnly)
    .map((race) => race.display)
    .sort()
    .join(', ');
  return `
Choose race:
${merged}.
Choice (or "help <race>"):`;
};

const outputCharacters = (account: ISavedAccount): string => {
  const merged = account.characterNames.map((characterName, characterIdx) => `${characterIdx + 1}: ${characterName}`).join('\n');
  return `
Choose character:
${merged}
${account.characterNames.length + 1}: Create a new character

Choice (#):`;
};

const handleNewCharacterNameConfirm = (state: NewCharacterNameConfirmState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  if (rawInput.toLowerCase() === 'y') {
    sendMessage(outputRaces());
    return { type: ConversationStateType.NEW_CHARACTER_RACE, account: state.account, characterName: state.characterName };
  } else if (rawInput.toLowerCase() === 'n') {
    sendMessage(outputCharacters(state.account));
    return { type: ConversationStateType.CHARACTER_PROMPT, account: state.account };
  }

  sendMessage(`Enter Y or N for creating new character with name ${state.characterName}.`);
  return state;
};

const outputClasses = (): string => {
  const merged = Object.values(Classes)
    .filter((clazz) => !clazz.npcOnly)
    .map((clazz) => clazz.display)
    .sort()
    .join(', ');
  return `
Choose class:
${merged}.
Choice (or "help <class>"):`;
};

const handleNewCharacterRace = (state: NewCharacterRaceState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  let cleaned = rawInput.toLowerCase().trim();
  let help = false;
  if (cleaned.startsWith('help ')) {
    help = true;
    cleaned = cleaned.split('help ')[1];
  }

  const race = Object.values(Races).find((race) => race.display.toLowerCase() === cleaned);
  if (!race) {
    sendMessage(`Invalid choice.${outputRaces()}`);
    return state;
  }

  if (help) {
    const merged = Object.entries(race.abilityModifiers)
      .map(([ability, modifier]) => `  ${ability.toLowerCase()}: ${modifier}`)
      .join('\n');
    sendMessage(`
${race.display}

Ability modifiers:
${merged}
${outputRaces()}`);
    return state;
  }

  sendMessage(outputClasses());
  return { ...state, type: ConversationStateType.NEW_CHARACTER_CLASS, raceType: race.type };
};

const outputAbilities = (abilityChoices: Partial<Record<AbilityType, number>>, raceType: RaceType): string => {
  const merged = Object.values(AbilityType)
    .map((abilityType) => {
      const selection = abilityChoices[abilityType];
      const modifier = Races[raceType].abilityModifiers[abilityType] ?? 0;
      const resolved = selection ? selection + modifier : '--';
      return `${abilityType.toLowerCase().padStart(15, ' ')}: ${selection ?? '--'} + ${modifier} = ${resolved}`;
    })
    .join('\n');
  return `
Abilities:
${merged}`;
};

const outputAbilityPrompt = (pickedAbilities: Partial<Record<AbilityType, number>>) => {
  const pickedCount = Object.keys(pickedAbilities).length;
  const remainingAbilities = Object.values(AbilityType).filter((type) => !pickedAbilities[type]);
  return `

Which ability do you want to be ${ABILITY_VALUES[pickedCount]}? ${remainingAbilities.map((type) => type.toLowerCase()).join(', ')}. Choice:`;
};

const handleNewCharacterClass = (state: NewCharacterClassState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  let cleaned = rawInput.toLowerCase().trim();
  let help = false;
  if (cleaned.startsWith('help ')) {
    help = true;
    cleaned = cleaned.split('help ')[1];
  }

  const clazz = Object.values(Classes).find((clazz) => clazz.display.toLowerCase() === cleaned);
  if (!clazz) {
    sendMessage(`Invalid choice.${outputClasses()}`);
    return state;
  }

  if (help) {
    sendMessage(`
${clazz.display}

Hit die: ${clazz.hitDie}
${outputClasses()}`);
    return state;
  }

  const newState: NewCharacterAbilitiesState = { ...state, type: ConversationStateType.NEW_CHARACTER_ABILITIES, classType: clazz.type, abilities: {} };
  sendMessage(`${outputAbilities(newState.abilities, newState.raceType)}${outputAbilityPrompt({})}`);
  return newState;
};

const outputWholeCharacter = (state: NewCharacterAbilitiesState) => {
  return `
Name: ${state.characterName}
Race: ${Races[state.raceType].display}
Class: ${Classes[state.classType].display}
${outputAbilities(state.abilities, state.raceType)}

Create this character? (Y/N)`;
};

const handleNewCharacterAbilities = (state: NewCharacterAbilitiesState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  const cleaned = rawInput.toLowerCase().trim();
  const pickedCount = Object.keys(state.abilities).length;
  const remainingAbilities = Object.values(AbilityType).filter((type) => !state.abilities[type]);

  if (remainingAbilities.length === 0) {
    if (cleaned === 'y') {
      sendMessage(outputWholeCharacter(state));
      return { ...state, type: ConversationStateType.NEW_CHARACTER_CONFIRM, abilities: state.abilities as Record<AbilityType, number> };
    } else {
      state.abilities = {};
      sendMessage(`${outputAbilities(state.abilities, state.raceType)}${outputAbilityPrompt(state.abilities)}`);
      return state;
    }
  }

  const ability = remainingAbilities.find((ability) => ability.toLowerCase() === cleaned);
  if (!ability) {
    sendMessage(`Invalid choice.${outputAbilities(state.abilities, state.raceType)}${outputAbilityPrompt(state.abilities)}`);
    return state;
  }

  state.abilities[ability as AbilityType] = ABILITY_VALUES[pickedCount];
  if (remainingAbilities.length > 1) {
    sendMessage(`${outputAbilities(state.abilities, state.raceType)}${outputAbilityPrompt(state.abilities)}`);
  } else {
    sendMessage(`${outputAbilities(state.abilities, state.raceType)}\n\nThese are the attributes you want? (Y/N)`);
  }
  return state;
};

const handleNewCharacterConfirm = (state: NewCharacterConfirmState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  if (rawInput.toLowerCase() === 'y') {
    return createCharacter(state, sendMessage);
  }
  sendMessage(outputCharacters(state.account));
  return { type: ConversationStateType.CHARACTER_PROMPT, account: state.account };
};

const createCharacter = (state: NewCharacterConfirmState, sendMessage: SendMessage): ConversationState => {
  const playerCount = fs.readdirSync('data/players').length;
  const race = Races[state.raceType];
  const playerDefinition: IPlayerDefinition = {
    accountId: state.account.accountId,
    room: getGameServerSafely().config.startingRoom,
    key: state.characterName.toLowerCase(),
    name: state.characterName,
    playerNumber: playerCount + 1,
    admin: playerCount === 0,
    race: state.raceType,
    class: state.classType,
    abilities: Object.entries(state.abilities).reduce<IAbilities>((acc, [abilityTypeStr, value]) => {
      const abilityType = abilityTypeStr as AbilityType;
      const modifiers: Record<string, number> = {};
      const racialModifier = race.abilityModifiers[abilityType] ?? 0;
      if (racialModifier) {
        modifiers['race'] = racialModifier;
      }
      acc[abilityType] = { baseValue: value, modifiers, value: value + racialModifier };
      return acc;
    }, defaultAbilities()),
  };
  const player = new Player(playerDefinition);
  player.save();
  state.account.characterNames.push(state.characterName);
  saveAccount(state.account);
  sendMessage(`
Character created.

Assuming place of ${state.characterName}...`);
  return { type: ConversationStateType.COMPLETE, account: state.account, player };
};

const handleState = (state: ConversationState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  switch (state.type) {
    case ConversationStateType.CHARACTER_PROMPT:
      return handleCharacterPrompt(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_NAME_PROMPT:
      return handleNewCharacterNamePrompt(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_NAME_CONFIRM:
      return handleNewCharacterNameConfirm(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_RACE:
      return handleNewCharacterRace(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_CLASS:
      return handleNewCharacterClass(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_ABILITIES:
      return handleNewCharacterAbilities(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_CONFIRM:
      return handleNewCharacterConfirm(state, sendMessage, rawInput);
  }
  return state;
};

export class LoginConversation {
  state: ConversationState;
  sendMessage: SendMessage;
  completeCallback: (player?: Player) => void;

  constructor(account: ISavedAccount, completeCallback: (player?: Player) => void) {
    this.sendMessage = (message: string) => getGameServerSafely().sendMessageToAccount(account.accountId, message);
    this.completeCallback = completeCallback;
    this.state = { type: ConversationStateType.CHARACTER_PROMPT, account: account };

    this.sendMessage(outputCharacters(account));
  }

  handleInput(rawInput: string) {
    this.state = handleState(this.state, this.sendMessage, rawInput);

    if (this.state.type === ConversationStateType.COMPLETE) {
      this.completeCallback(this.state.player);
    }
  }
}
