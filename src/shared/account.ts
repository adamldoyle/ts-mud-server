import fs from 'fs';
import bcrypt from 'bcrypt';
import { ISavedAccount } from './types';

export const accountExists = (username: string): boolean => {
  return fs.existsSync(`data/accounts/${username.toLowerCase()}.json`);
};

export const getPotentialAccount = (username: string): ISavedAccount | undefined => {
  if (accountExists(username)) {
    const rawAccount = fs.readFileSync(`data/accounts/${username.toLowerCase()}.json`, 'utf-8');
    return JSON.parse(rawAccount) as ISavedAccount;
  }
  return undefined;
};

export const generatePasswordHash = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

export const verifyPassword = (account: ISavedAccount, password: string): boolean => {
  return bcrypt.compareSync(password, account.password);
};

export const saveAccount = (account: ISavedAccount) => {
  fs.writeFileSync(`data/accounts/${account.username}.json`, JSON.stringify(account, null, 2), { encoding: 'utf-8' });
};
