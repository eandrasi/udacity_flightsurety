# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)








  // "devDependencies": {
  //   "@babel/cli": "^7.5.5",
  //   "@babel/core": "^7.5.5",
  //   "@babel/plugin-proposal-class-properties": "^7.5.5",
  //   "@babel/plugin-proposal-object-rest-spread": "^7.5.5",
  //   "@babel/preset-env": "^7.5.5",
  //   "babel-core": "6.26.3",
  //   "babel-loader": "8.0.5",
  //   "babel-polyfill": "6.26.0",
  //   "babel-preset-es2015": "6.24.1",
  //   "babel-preset-stage-0": "6.24.1",
  //   "bignumber.js": "9.0.0",
  //   "css-loader": "^3.1.0",
  //   "express": "4.17.1",
  //   "file-loader": "4.1.0",
  //   "html-loader": "0.5.5",
  //   "html-webpack-plugin": "^3.2.0",
  //   "keccak": "^2.0.0",
  //   "openzeppelin-solidity": "^2.3.0",
  //   "start-server-webpack-plugin": "2.2.5",
  //   "style-loader": "^0.23.1",
  //   "superstatic": "6.0.4",
  //   "truffle": "5.0.29",
  //   "truffle-assertions": "^0.9.1",
  //   "truffle-hdwallet-provider": "1.0.15",
  //   "web3": "1.2.0",
  //   "webpack": "^4.38.0",
  //   "webpack-cli": "^3.3.6",
  //   "webpack-dev-server": "^3.7.2",
  //   "webpack-node-externals": "1.7.2"
  // },
  // "dependencies": {}