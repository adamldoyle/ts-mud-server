import fs from 'fs';
import * as account from './account';

jest.mock('fs');

describe('shared/account', () => {
  describe('accountExists', () => {
    test('returns true if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(account.accountExists('TestAccount')).toBeTruthy();
      expect(fs.existsSync).toBeCalledWith(`data/accounts/testaccount.json`);
    });

    test('returns false if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(account.accountExists('TestAccount')).toBeFalsy();
      expect(fs.existsSync).toBeCalledWith(`data/accounts/testaccount.json`);
    });
  });

  describe('getPotentialAccount', () => {
    test('returns undefined if no file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(account.getPotentialAccount('TestAccount')).toBeUndefined();
      expect(fs.existsSync).toBeCalledWith(`data/accounts/testaccount.json`);
    });

    test('returns player file contents if exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ accountId: 'testAccountId' }));
      expect(account.getPotentialAccount('TestAccount')).toEqual({ accountId: 'testAccountId' });
      expect(fs.existsSync).toBeCalledWith(`data/accounts/testaccount.json`);
      expect(fs.readFileSync).toBeCalledWith(`data/accounts/testaccount.json`, 'utf-8');
    });
  });

  describe('generatePasswordHash', () => {
    test('hashes password', () => {
      expect(account.generatePasswordHash('password')).not.toEqual('password');
    });
  });

  describe('verifyPassword', () => {
    test('returns true if password verified via hashed password', () => {
      const hashed = account.generatePasswordHash('password');
      expect(account.verifyPassword({ password: hashed } as any, 'password')).toBeTruthy();
    });

    test('returns false if password not verified via hashed password', () => {
      const hashed = account.generatePasswordHash('password');
      expect(account.verifyPassword({ password: hashed } as any, 'password2')).toBeFalsy();
    });
  });

  describe('saveAccount', () => {
    test('writes account to file', () => {
      const player = { accountId: 'testAccountId', username: 'TestAccount' } as any;
      account.saveAccount(player);
      expect(fs.writeFileSync).toBeCalledWith(`data/accounts/testaccount.json`, JSON.stringify(player, null, 2), { encoding: 'utf-8' });
    });
  });
});
