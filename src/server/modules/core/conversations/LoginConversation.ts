import fs from 'fs';
import { ISavedAccount } from '@shared/types';
import { saveAccount } from '@shared/account';
import { Instance } from '@server/GameServerInstance';
import { IPlayerDefinition, Player } from '@core/entities/character';
import { stringUtils } from '@core/utils';

enum ConversationStateType {
  CHARACTER_PROMPT,
  NEW_CHARACTER_NAME_PROMPT,
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

interface NewCharacterConfirmState {
  type: ConversationStateType.NEW_CHARACTER_CONFIRM;
  account: ISavedAccount;
  characterName: string;
}

interface CompleteState {
  type: ConversationStateType.COMPLETE;
  account: ISavedAccount;
  player?: Player;
}

type ConversationState = CharacterPromptState | NewCharacterNamePromptState | NewCharacterConfirmState | CompleteState;

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
    return { type: ConversationStateType.NEW_CHARACTER_NAME_PROMPT, account: state.account };
  }

  const characterName = state.account.characterNames[characterIndex - 1];
  const player = Player.load(characterName);
  sendMessage(`Assuming place of ${characterName}...`);
  return { type: ConversationStateType.COMPLETE, account: state.account, player };
};

const handleNewCharacterNamePrompt = (state: NewCharacterNamePromptState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  const newCharacterName = stringUtils.capitalize(rawInput.trim());
  if (Player.playerExists(newCharacterName)) {
    sendMessage('Name already in use. Name:');
    return state;
  }

  sendMessage(`Create new character with name ${newCharacterName}? (Y/N)`);
  return { type: ConversationStateType.NEW_CHARACTER_CONFIRM, account: state.account, characterName: newCharacterName };
};

const handleNewCharacterConfirm = (state: NewCharacterConfirmState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  if (rawInput.toLowerCase() === 'y') {
    const playerCount = fs.readdirSync('data/players').length;
    const playerDefinition: IPlayerDefinition = {
      accountId: state.account.accountId,
      room: Instance.gameServer?.config.startingRoom ?? '',
      key: state.characterName.toLowerCase(),
      name: state.characterName,
      playerNumber: playerCount + 1,
      admin: playerCount === 0,
    };
    const player = new Player(playerDefinition);
    player.save();
    state.account.characterNames.push(state.characterName);
    saveAccount(state.account);
    sendMessage('Character created.');
    sendMessage(`Assuming place of ${state.characterName}...`);
    return { type: ConversationStateType.COMPLETE, account: state.account, player };
  } else if (rawInput.toLowerCase() === 'n') {
    outputCharacters(state.account, sendMessage);
    return { type: ConversationStateType.CHARACTER_PROMPT, account: state.account };
  }

  sendMessage(`Enter Y or N for creating new character with name ${state.characterName}.`);
  return state;
};

const handleState = (state: ConversationState, sendMessage: SendMessage, rawInput: string): ConversationState => {
  switch (state.type) {
    case ConversationStateType.CHARACTER_PROMPT:
      return handleCharacterPrompt(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_NAME_PROMPT:
      return handleNewCharacterNamePrompt(state, sendMessage, rawInput);
    case ConversationStateType.NEW_CHARACTER_CONFIRM:
      return handleNewCharacterConfirm(state, sendMessage, rawInput);
  }
  return state;
};

const outputCharacters = (account: ISavedAccount, sendMessage: SendMessage) => {
  sendMessage(
    `\nChoose character:\n${account.characterNames.map((characterName, characterIdx) => `${characterIdx + 1}. ${characterName}`).join('\n')}\n${
      account.characterNames.length + 1
    }: Create a new character\n\nChoice (#):`
  );
};

export class LoginConversation {
  state: ConversationState;
  sendMessage: SendMessage;
  completeCallback: (player?: Player) => void;

  constructor(account: ISavedAccount, completeCallback: (player?: Player) => void) {
    this.sendMessage = (message: string) => Instance.gameServer?.sendMessageToAccount(account.accountId, message);
    this.completeCallback = completeCallback;
    this.state = { type: ConversationStateType.CHARACTER_PROMPT, account: account };

    outputCharacters(account, this.sendMessage);
  }

  handleInput(rawInput: string) {
    this.state = handleState(this.state, this.sendMessage, rawInput);

    if (this.state.type === ConversationStateType.COMPLETE) {
      this.completeCallback(this.state.player);
    }
  }
}
