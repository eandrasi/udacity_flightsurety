var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "drip fence buddy news assault drip simple bounce strategy scissors arch coconut";

module.exports = {
  networks: {
    development: {
      //provider: function() {
        //return new HDWalletProvider(mnemonic, "http://127.0.0.1:9545/", 0, 50);
        //return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      //},
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4600000
    }
  },
  compilers: {
    solc: {
      version: "^0.5.0"
    }
  }
};