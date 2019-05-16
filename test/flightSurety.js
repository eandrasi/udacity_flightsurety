
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');
// const keccak = require('keccak')

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
});

/****************************************************************************************/
/* Operations and Settings                                                              */
/****************************************************************************************/

describe("Airline registration", () => {

    describe("Registering new Airlines", () => {

        it("the firstAirline is already registered at contract deployment", async () => {
            assert.isTrue(await config.flightSuretyData.isAirline.call(config.firstAirline), 
                                      "config.firstAirline is not registered at contract deployment")
          })
          
          it("accounts[2] is not registered at contract deployment", async () => {
            assert.isFalse(await config.flightSuretyData.isAirline.call(accounts[2]), 
            "accounts[2] is not registered at contract deployment")
          })
      
          it("firstAirline can't register another until the it has paid the required fund ammount", async () => {
              let newAirline = accounts[2];
      
              await truffleAssert.fails(
                  config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline},
                      truffleAssert.ErrorType.REVERT,
                      "Only operational Airlines can register new airlines" )
              );
              // await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
              // assert.isFalse(await config.flightSuretyData.isAirline.call(accounts[2]));
          })
      
          it("can get the number of airlines registered", async () => {
              let result = await config.flightSuretyData.countAirlines.call()
              assert.equal(result.toNumber(), 1, "count of airlines does not match")
          })
      
          it("firstAirline can pay the fund", async () => {
              let fundingValue = web3.toWei('10', 'ether')
              let initialBalance = await web3.eth.getBalance(config.flightSuretyData.address)
              await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue})
              let newBalance = await web3.eth.getBalance(config.flightSuretyData.address)
              assert.equal(newBalance.toNumber(), initialBalance.toNumber() + fundingValue, "Funds have not been transfered")
          })
      
          it("firstAirline can register another airline after the fund has been paid", async () => {
              let newAirline = accounts[2];
              await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
              assert.isTrue(await config.flightSuretyData.isAirline.call(accounts[2]), 
                          "the accounts[2] has not been registered as an airline");
      
              let result = await config.flightSuretyData.countAirlines.call()
              assert.equal(result.toNumber(), 2, "count of airlines does not match")
          })
      
          it("can register up to 4 airlines without voting", async () => {
              let newAirline1 = accounts[3];
              let newAirline2 = accounts[4];
              await config.flightSuretyApp.registerAirline(newAirline1, {from: config.firstAirline});
              await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
              let countAirlines = await config.flightSuretyData.countAirlines.call()
              assert.equal(countAirlines, 4, "Could not register airlines")
          })
      
          it("airlines 2, 3 and 4 can pay the fund", async () => {
              let countAirlines = await config.flightSuretyData.countAirlines.call()
              let operationalAirlines = await config.flightSuretyData.operationalAirlinesCount.call()
              // console.log(`Count airlines is: ${countAirlines} | operationa airlines count: ${operationalAirlines}`)
              let fundingValue = web3.toWei('10', 'ether')
              await config.flightSuretyApp.payFunding({from: accounts[2], value: fundingValue})
              await config.flightSuretyApp.payFunding({from: accounts[3], value: fundingValue})
              await config.flightSuretyApp.payFunding({from: accounts[4], value: fundingValue})
              let newOperationalAirlines = await config.flightSuretyData.operationalAirlinesCount.call()
              assert.equal(newOperationalAirlines.toNumber(), 4, "not all airlines have paid funding")
          })
      
          it("can't register 5th airline until voting is complete", async () => {
              let newAirline = accounts[5]
              await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline})
              let countAirlines = await config.flightSuretyData.countAirlines.call()
              assert.equal(countAirlines, 4, "Number of airlines is wrong")
          })
      
          it("airlinesAwaitingVotes contains address of accounts[5]", async () => {
              let result = await config.flightSuretyApp.getAirlinesAwaitingVotes.call()
              assert.include(result, accounts[5])
          })
      
          it("other airlines can vote on registering the new airline", async () => {
              let newAirline = accounts[5]
              await config.flightSuretyApp.voteAirline(newAirline, {from: config.firstAirline})
              await config.flightSuretyApp.voteAirline(newAirline, {from: accounts[2]})
              let result = await config.flightSuretyApp.getVotesOnNewRegistration.call(newAirline);
              assert.include(result, config.firstAirline)
              assert.include(result, accounts[2])
          })
      
          it("can count number of votes", async () => {
              let result = await config.flightSuretyApp.getVotesCount(accounts[5])
              assert.equal(result.toNumber(), 2, "Wrong count on votes")
          })
      
          it("should not register vote twice if same airline votes multiple times", async () => {
              let initialVoteCount = await config.flightSuretyApp.getVotesCount(accounts[5])
              await config.flightSuretyApp.voteAirline(accounts[5], {from: accounts[2]})
              let afterVoteCount = await config.flightSuretyApp.getVotesCount(accounts[5])
              assert.equal(initialVoteCount.toNumber(), afterVoteCount.toNumber(), "Same vote was registered twice")
          })
      
          it("registers the new airline once more than 50% of the votes are given", async () => {
              let newAirline = accounts[5]
              let initialRegisteredAirlines = await config.flightSuretyData.countAirlines.call()
              await config.flightSuretyApp.voteAirline(newAirline, {from: accounts[3]}) 
              let afterRegisteredAirline = await config.flightSuretyData.countAirlines.call()
              assert.equal(initialRegisteredAirlines.toNumber() + 1, afterRegisteredAirline, "The airline has not been registered")
          })
    })

    describe("Airlines can create flights", () => {

        it("Airline can register new flight", async () => {
            let flightNumber = "FL100"
            let flightTime = Math.floor(Date.now() / 1000) + 10000
            let result = await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime)
            truffleAssert.eventEmitted(result, 'FlightRegistered') 
        })

        it("can read flight information", async () => {
            let flightNumber = "FL200"
            let flightTime = Math.floor(Date.now() / 1000) + 10000
            await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime)
            let flightKey = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumber, flightTime)
            let readFlight = await config.flightSuretyData.flights.call(flightKey)

            assert.include(readFlight, config.firstAirline)
            assert.include(readFlight, "FL200")
            assert.equal(readFlight[2].toNumber(), flightTime)
        })
    })

})

describe.only("Pasangers Tests", () => {
    let flights = []
    
    it("can set up seed data", async () => {
        let flightKey
        let fundingValue = web3.toWei('10', 'ether')
        // let newAirline1 = accounts[2];
        // let newAirline2 = accounts[3];
        await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue})
        // await config.flightSuretyApp.registerAirline(newAirline1, {from: config.firstAirline});
        // await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        // await config.flightSuretyApp.payFunding({from: newAirline1, value: fundingValue})
        // await config.flightSuretyApp.payFunding({from: newAirline2, value: fundingValue})

        let flightNumber = "FL300"
        let flightTime = Math.floor(Date.now() / 1000) + 10000
        await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime)
        flightKey = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumber, flightTime)
        
        let readFlight = await config.flightSuretyData.flights.call(flightKey)
        
        assert.include(readFlight, config.firstAirline)
        assert.include(readFlight, "FL300")
        assert.equal(readFlight[2].toNumber(), flightTime)

        await config.flightSuretyApp.registerFlight(config.firstAirline, "FlightTooOld", 100)
    })

    it("can list all flights", async () => {
        let size = await config.flightSuretyData.flightKeysSize.call();
        for(i = 0; i < size; i++){
            let flKey = await config.flightSuretyData.flightKeys.call(i)
            // console.log(`flkey: ${flKey}`)
            let flight = await config.flightSuretyData.flights.call(flKey)
            // console.log(`flight: ${flight}`)
            flights.push(flight)
        }
        // console.log(`All flights: ${flights}`)
        assert.equal(flights.length, 2, "flights should contain 2 items")
        assert.include(flights[0], "FL300")
        assert.include(flights[1], "FlightTooOld")
    })

    it("can buy insurance only for existing flight", async () => {
        let flightKey = flights[0][0]
        let ammount = web3.toWei('0.2345', 'ether')
        let exisitingFlight = await config.flightSuretyApp.buyInsurance(flightKey, ammount)
        // console.log(exisitingFlight)

        let insurancesSize = await config.flightSuretyData.insurancesSize.call(flightKey)
        console.log(`InsurancesSize: ${insurancesSize}`)

        let insuranceAtZero = await config.flightSuretyData.getInsuranceForIndex.call(flightKey, 0)
        console.log(`Insurance At index 0: ${insuranceAtZero}`)
        // assert true for existing flight
        // assert false for non exisitng fight
    })
    
    it("can buy insurance only for future flights", async () => {
        // assert fail when trying to buy insurance for flight in the past
    })

    it("can buy insurance for max ammount of 1 eth", async () => {
        // assert true for 0.8 eth
        // assert false for 1.2 eth
    })
    
    it("can receive credit when flight is delayed", async () => {
        // credit received when flight delayed
        // credit not received when flight on time
    })

    it("can withdraw funds owed from insurance payout", async () => {
        // true for flight delayed
    })



    it("", async () => {})

    it("", async () => {})
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
  })




 

});
