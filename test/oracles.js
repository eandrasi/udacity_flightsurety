
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');


contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);

    // Watch contract events
    
  });
  
  describe.only("Initial Oracles tests", ()=>{
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;

    let flightNumber = 'ND1309'; // Course number
    let flightTime = Math.floor(Date.now() / 1000);

    it('can register oracles', async () => {
    
      // ARRANGE
      let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

      // ACT
      for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
        await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
        let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      }
    });

    it("can register a flight", async () => {
      let fundingValue = web3.toWei('10.1', 'ether')
      await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue})
      let result = await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime, {from: config.firstAirline})
      truffleAssert.eventEmitted(result, 'FlightRegistered')
    })
  
    it('can request flight status', async () => {  
      // Submit a request for oracles to get status information for a flight
      let result = await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flightNumber, flightTime);
      let index = result.logs[0].args.index.toNumber()
      console.log(index)
      truffleAssert.eventEmitted(result, "OracleRequest")
      truffleAssert.prettyPrintEmittedEvents(result, 2)


      // Since the Index assigned to each test account is opaque by design
      // loop through all the accounts and for each account, all its Indexes (indices?)
      // and submit a response. The contract will reject a submission if it was
      // not requested so while sub-optimal, it's a good test of that feature
      for(let a=1; a<TEST_ORACLES_COUNT; a++) {
  
        // Get oracle information
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
        // console.log(`oracleIndexes: ${oracleIndexes}`)

        for(let idx=0;idx<3;idx++) {
  
          try {
            // Submit a response...it will only be accepted if there is an Index match
            truffleAssert.prettyPrintEmittedEvents(await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flightNumber, flightTime, STATUS_CODE_ON_TIME, { from: accounts[a] }), 2)
            // truffleAssert.prettyPrintEmittedEvents(a, 2)
          }
          catch(e) {
            // Enable this when debugging
             console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightNumber, flightTime);
             console.log(e)
          }
  
        }
      }
  
  
    })

    
  })


 
});
