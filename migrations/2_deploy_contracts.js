const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function(deployer, network, accounts) {

    // let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
    let firstAirline = accounts[1]
    let flightSuretyData, flightSuretyApp

    deployer.deploy(FlightSuretyData, firstAirline)
    .then((instance) => {
        flightSuretyData = instance
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then((instance) => {
                    flightSuretyApp = instance
                    let config = {
                        localhost: {
                            url: 'http://localhost:9545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address,
                            firstAirline: firstAirline
                            // I need here an array of addresses for the Oracles
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    return flightSuretyData.authorizeCaller(flightSuretyApp.address)
                });
    });
}