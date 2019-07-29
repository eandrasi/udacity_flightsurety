import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "drip fence buddy news assault drip simple bounce strategy scissors arch coconut";

let a = new HDWalletProvider(mnemonic, "http://127.0.0.1:9545/", 0, 50);


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
console.log("%%%%%%%%%%%%%%")
console.log(a.addresses)
console.log("%%%%%%%%%%%%%%")
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;