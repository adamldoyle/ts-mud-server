import * as uuid from 'uuid';
import { IAccount, ISavedAccount } from '@shared/types';
import { getPotentialAccount, saveAccount, generatePasswordHash, verifyPassword } from '@shared/account';
import { Instance } from './ProxyServer';
import { IConversation, IUserConnection } from './types';

enum ConversationStateType {
  USERNAME_PROMPT,
  NEW_ACCOUNT,
  NEW_ACCOUNT_PASSWORD_PROMPT,
  PASSWORD_PROMPT,
  COMPLETE,
}

interface UsernamePromptState {
  type: ConversationStateType.USERNAME_PROMPT;
}

interface NewAccountState {
  type: ConversationStateType.NEW_ACCOUNT;
  username: string;
}

interface NewAccountPasswordPromptState {
  type: ConversationStateType.NEW_ACCOUNT_PASSWORD_PROMPT;
  username: string;
}

interface PasswordPromptState {
  type: ConversationStateType.PASSWORD_PROMPT;
  account: ISavedAccount;
}

interface CompleteState {
  type: ConversationStateType.COMPLETE;
}

type ConversationState = UsernamePromptState | NewAccountState | NewAccountPasswordPromptState | PasswordPromptState | CompleteState;

const handleUsernamePrompt = (state: UsernamePromptState, userConnection: IUserConnection, rawInput: string): ConversationState => {
  const username = rawInput.toLowerCase();
  const potentialAccount = getPotentialAccount(username);
  if (potentialAccount) {
    userConnection.send('Password:');
    return { type: ConversationStateType.PASSWORD_PROMPT, account: potentialAccount };
  }
  userConnection.send('Unknown account, do you want to create one with this username? (Y/N)');
  return { type: ConversationStateType.NEW_ACCOUNT, username };
};

const handleNewAccount = (state: NewAccountState, userConnection: IUserConnection, rawInput: string): ConversationState => {
  if (rawInput.toLowerCase() === 'y') {
    userConnection.send('Password:');
    return { type: ConversationStateType.NEW_ACCOUNT_PASSWORD_PROMPT, username: state.username };
  } else if (rawInput.toLowerCase() === 'n') {
    userConnection.send('Username:');
    return { type: ConversationStateType.USERNAME_PROMPT };
  }
  userConnection.send('Enter Y or N to confirm account creation.');
  return state;
};

const completeLogin = (userConnection: IUserConnection, account: IAccount): ConversationState => {
  Instance.proxyServer?.userConnections
    .filter((otherConnection) => otherConnection.account?.accountId === account.accountId)
    .forEach((existingConnection) => {
      existingConnection.account = undefined;
      Instance.proxyServer?.disconnectUser(existingConnection);
    });

  userConnection.account = account;
  userConnection.conversation = undefined;
  Instance.proxyServer?.onUserLogin(userConnection);
  return { type: ConversationStateType.COMPLETE };
};

const handleNewAccountPasswordPrompt = (state: NewAccountPasswordPromptState, userConnection: IUserConnection, rawInput: string): ConversationState => {
  const savedAccount: ISavedAccount = {
    accountId: uuid.v4(),
    username: state.username,
    password: generatePasswordHash(rawInput),
    characterNames: [],
  };
  saveAccount(savedAccount);
  userConnection.send('New account created.');
  return completeLogin(userConnection, { accountId: savedAccount.accountId, username: savedAccount.username });
};

const handlePasswordPrompt = (state: PasswordPromptState, userConnection: IUserConnection, rawInput: string): ConversationState => {
  if (!verifyPassword(state.account, rawInput)) {
    userConnection.send('Invalid password.');
    userConnection.send('Username:');
    return { type: ConversationStateType.USERNAME_PROMPT };
  }
  return completeLogin(userConnection, { accountId: state.account.accountId, username: state.account.username });
};

const handleState = (state: ConversationState, userConnection: IUserConnection, rawInput: string): ConversationState => {
  switch (state.type) {
    case ConversationStateType.USERNAME_PROMPT:
      return handleUsernamePrompt(state, userConnection, rawInput);
    case ConversationStateType.NEW_ACCOUNT:
      return handleNewAccount(state, userConnection, rawInput);
    case ConversationStateType.NEW_ACCOUNT_PASSWORD_PROMPT:
      return handleNewAccountPasswordPrompt(state, userConnection, rawInput);
    case ConversationStateType.PASSWORD_PROMPT:
      return handlePasswordPrompt(state, userConnection, rawInput);
  }
  return state;
};

export class LoginConversation implements IConversation {
  userConnection: IUserConnection;
  state: ConversationState;

  constructor(userConnection: IUserConnection) {
    this.userConnection = userConnection;
    this.state = { type: ConversationStateType.USERNAME_PROMPT };

    userConnection.send('Username:');
  }

  handleInput(rawInput: string) {
    if (!rawInput || !rawInput.trim()) {
      this.userConnection.send('Enter something');
      return;
    }

    this.state = handleState(this.state, this.userConnection, rawInput);
  }
}
