export interface ISettings {
  proxyPort: number;
  serverPort: number;
  startingRoom: string;
}

export interface IAccount {
  accountId: string;
  username: string;
}

export interface ISavedAccount extends IAccount {
  password: string;
  characterNames: string[];
}
