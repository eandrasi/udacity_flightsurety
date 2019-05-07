
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
});

/****************************************************************************************/
/* Operations and Settings                                                              */
/****************************************************************************************/

describe.only("Airline registration", () => {
    it("the firstAirline is already registered at contract deployment", async () => {
      assert.isTrue(await config.flightSuretyData.isAirline.call(config.firstAirline), 
                                "config.firstAirline is not registered at contract deployment")
    })
    
    it("accounts[2] is not registered at contract deployment", async () => {
      assert.isFalse(await config.flightSuretyData.isAirline.call(accounts[2]), 
      "accounts[2] is not registered at contract deployment")
    })
})

describe("Initial flightSurety tests", ()=>{
    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");
    
      });
    
      it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    
          // Ensure that access is denied for non-Contract Owner account
          let accessDenied = false;
          try 
          {
              await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
          }
          catch(e) {
              accessDenied = true;
          }
          assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
                
      });
    
      it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    
          // Ensure that access is allowed for Contract Owner account
          let accessDenied = false;
          try 
          {
              await config.flightSuretyData.setOperatingStatus(false);
          }
          catch(e) {
              accessDenied = true;
          }
          assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
          
      });
    
      it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    
          await config.flightSuretyData.setOperatingStatus(false);
    
          let reverted = false;
          try 
          {
              await config.flightSurety.setTestingMode(true);
          }
          catch(e) {
              reverted = true;
          }
          assert.equal(reverted, true, "Access not blocked for requireIsOperational");      
    
          // Set it back for other tests to work
          await config.flightSuretyData.setOperatingStatus(true);
    
      });
    
      it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        
        // ARRANGE
        let newAirline = accounts[2];
    
        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
        }
        catch(e) {
            console.log(e)
        }
        let result = await config.flightSuretyData.isAirline.call(accounts[2]); 
        // console.log(result)
    
        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    
      });
  })




 

});
