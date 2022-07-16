# ts-mud-server

Basic MUD server executed via Node using Typescript. This project is majorly in the early development stage.

## Features

- Runs via two services (a proxy and game server) to support restarting game server without disconnecting users.
- Rooms/items/characters defined via zones that can be added to `src/server/zones`

## Installation

1. Copy `settings.sample.json` and update with desired settings
2. `npm install`
3. `npm run proxy:start` OR `ts-node src/startProxyServer.ts --settings ../settings.json` (settings path is relative to src directory)
4. `npm run game:start` OR `nodemon src/startGameServer.ts --settings ../settings.json` (settings path is relative to src directory)
5. Connect to proxy via configured port from favorite MUD client

## Third party references

Check `./licenses` for license files for different references.

- Telnet coded used from https://github.com/madjake/node-mud-server

## Contributors

- Adam Doyle (adamldoyle@gmail.com)
