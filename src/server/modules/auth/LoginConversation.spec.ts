import fs from 'fs';
import { Instance } from '@server/GameServerInstance';
import { buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { LoginConversation } from './LoginConversation';
import { Room } from '../core/entities/room';
import { IPlayerDefinition } from '../core/entities/character';

jest.mock('fs');
jest.mock('bcryptjs');

describe('LoginConversation', () => {
  let starterRoom: Room;
  beforeEach(() => {
    initializeTestServer();
    const zone = buildZone({}, true);
    starterRoom = buildRoom(zone, 'starterRoom');

    (fs.readdirSync as jest.Mock).mockReturnValue(['', '']);
  });

  const startConversation = (names: string[]) => {
    const complete = jest.fn();
    const conversation = new LoginConversation(
      {
        accountId: 'testAccountId',
        username: 'testUsername',
        password: 'testPassword',
        characterNames: names,
      },
      complete
    );
    return conversation;
  };

  const getLastMsg = () => {
    const calls = (Instance.gameServer?.sendMessageToAccount as jest.Mock).mock.calls;
    return calls[calls.length - 1][1];
  };

  test('supports creating a first character', () => {
    const conversation = startConversation([]);
    expect(getLastMsg()).toEqual('\nChoose character:\n\n1: Create a new character\n\nChoice (#):');
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
    conversation.handleInput('newName');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('y');
    expect(getLastMsg()).toEqual('Character created.\nAssuming place of Newname...');

    expect(fs.writeFileSync).toBeCalledWith('data/players/newname.json', expect.any(String), { encoding: 'utf-8' });
    const newFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(newFile).toEqual({
      accountId: 'testAccountId',
      room: 'starterRoom@testZone',
      key: 'newname',
      name: 'Newname',
      playerNumber: 3,
      admin: false,
      inventory: [],
      workingData: {},
    });

    expect(fs.writeFileSync).toBeCalledWith('data/accounts/testusername.json', expect.any(String), { encoding: 'utf-8' });
    const savedFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[1][1]);
    expect(savedFile).toEqual({
      accountId: 'testAccountId',
      username: 'testUsername',
      password: 'testPassword',
      characterNames: ['Newname'],
    });

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const newPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(newPlayer.key === 'newname');
  });

  test('supports creating a second character', () => {
    const conversation = startConversation(['Oldname']);
    expect(getLastMsg()).toEqual('\nChoose character:\n1: Oldname\n2: Create a new character\n\nChoice (#):');
    conversation.handleInput('2');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
    conversation.handleInput('newName');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('y');
    expect(getLastMsg()).toEqual('Character created.\nAssuming place of Newname...');

    expect(fs.writeFileSync).toBeCalledWith('data/players/newname.json', expect.any(String), { encoding: 'utf-8' });
    const newFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(newFile).toEqual({
      accountId: 'testAccountId',
      room: 'starterRoom@testZone',
      key: 'newname',
      name: 'Newname',
      playerNumber: 3,
      admin: false,
      inventory: [],
      workingData: {},
    });

    expect(fs.writeFileSync).toBeCalledWith('data/accounts/testusername.json', expect.any(String), { encoding: 'utf-8' });
    const savedFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[1][1]);
    expect(savedFile).toEqual({
      accountId: 'testAccountId',
      username: 'testUsername',
      password: 'testPassword',
      characterNames: ['Oldname', 'Newname'],
    });

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const newPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(newPlayer.key === 'newname');
  });

  test('supports logging in as existing character', () => {
    const oldPlayerDef: IPlayerDefinition = {
      key: 'oldname',
      accountId: 'testAccountId',
      room: 'starterRoom@testZone',
      playerNumber: 2,
      name: 'Oldname',
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldPlayerDef));
    const conversation = startConversation(['Oldname']);
    expect(getLastMsg()).toEqual('\nChoose character:\n1: Oldname\n2: Create a new character\n\nChoice (#):');
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Assuming place of Oldname...');

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const oldPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(oldPlayer.key === 'oldname');
  });

  test('shows error if try to pick non-option', () => {
    const conversation = startConversation(['Oldname']);
    expect(getLastMsg()).toEqual('\nChoose character:\n1: Oldname\n2: Create a new character\n\nChoice (#):');
    conversation.handleInput('3');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('0');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('a');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('2');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
  });

  test('shows error if new name taken', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const conversation = startConversation([]);
    expect(getLastMsg()).toEqual('\nChoose character:\n\n1: Create a new character\n\nChoice (#):');
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
    conversation.handleInput('Existingname');
    expect(getLastMsg()).toEqual('Name already in use. Name:');
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
  });

  test('shows error if not y or n on confirming new name', () => {
    const conversation = startConversation([]);
    expect(getLastMsg()).toEqual('\nChoose character:\n\n1: Create a new character\n\nChoice (#):');
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Z');
    expect(getLastMsg()).toEqual('Enter Y or N for creating new character with name Newname.');
    conversation.handleInput('Y');
    expect(getLastMsg()).toEqual('Character created.\nAssuming place of Newname...');
  });

  test('supports rejecting new name', () => {
    const conversation = startConversation([]);
    expect(getLastMsg()).toEqual('\nChoose character:\n\n1: Create a new character\n\nChoice (#):');
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Creating a new character...\n\nName:');
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('N');
    expect(getLastMsg()).toEqual('\nChoose character:\n\n1: Create a new character\n\nChoice (#):');
  });
});
