
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

describe("Operational status control", () => {
    it("can get the operational status", async () =>{
        let statusApp = await config.flightSuretyApp.isOperational.call()
        assert.isTrue(statusApp, "Operational status App is false")
        let statusData = await config.flightSuretyData.isOperational.call()
        assert.isTrue(statusData, "Operational status Data is false")
    })

    it("functions are working when operational is true", async () => {
        let resultApp = await config.flightSuretyApp.getAirlinesAwaitingVotes.call()
        assert.isArray(resultApp, "resultApp is not Array")
        let resultData = await config.flightSuretyData.isAirline.call(config.firstAirline)
        assert.isTrue(resultData, "config.firstAirline is not Airline")
    })

    it("can change to false the operational status", async () => {
        let appOperational = await config.flightSuretyApp.setOperational(false, {from: config.owner})
        let dataOperational = await config.flightSuretyData.setOperational(false, {from: config.owner})

        
        let statusApp = await config.flightSuretyApp.isOperational.call()
        let statusData = await config.flightSuretyData.isOperational.call()
        
        assert.isFalse(statusApp, "Operational status App is false")
        assert.isFalse(statusData, "Operational status Data is false")
        truffleAssert.eventEmitted(appOperational, "OperationalAppStateChanged")
        truffleAssert.eventEmitted(dataOperational, "OperationalDataStateChanged")

    })

    it("functions are not working when operational is false", async () => {
        await truffleAssert.reverts(config.flightSuretyApp.getAirlinesAwaitingVotes.call(),
                            "Contract is currently not operational")
        await truffleAssert.reverts(config.flightSuretyData.isAirline.call(config.firstAirline),
                            "Contract is currently not operational")
    })

    it("only the contract owner can change the operating status", async () => {
        await truffleAssert.reverts(config.flightSuretyApp.setOperational(true, {from: accounts[3]}),
                            "Caller is not contract owner")
        await truffleAssert.reverts(config.flightSuretyData.setOperational(true, {from: accounts[3]}),
                            "Caller is not contract owner")
    })

    it("can change to true the operational status", async () => {
        let appOperational = await config.flightSuretyApp.setOperational(true, {from: config.owner})
        let dataOperational = await config.flightSuretyData.setOperational(true, {from: config.owner})
        let statusApp = await config.flightSuretyApp.isOperational.call()
        let statusData = await config.flightSuretyData.isOperational.call()
        assert.isTrue(statusApp, "Operational status App is false")
        assert.isTrue(statusData, "Operational status Data is false")
        truffleAssert.eventEmitted(appOperational, "OperationalAppStateChanged")
        truffleAssert.eventEmitted(dataOperational, "OperationalDataStateChanged")
    })

})

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

          it("does not accept less than 10 ether as fund", async () => {
            let fundingValue = web3.utils.toWei('9.1', 'ether')
            await truffleAssert.reverts(config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue, gasPrice: 0}),
                                         "You must pay minimum 10 ether for funding")
          })
      
          it("firstAirline can pay the fund", async () => {
              let fundingValue = web3.utils.toWei('10.1', 'ether')
              let initialBalance = await web3.eth.getBalance(config.flightSuretyData.address)
              let result = await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue, gasPrice: 0})
              
              await truffleAssert.eventEmitted(result, "AirlinePaidFunding")
              
              let newBalance = await web3.eth.getBalance(config.flightSuretyData.address)
            //   assert.equal(newBalance.toNumber(), initialBalance.toNumber() + fundingValue, "Funds have not been transfered")
              let bnInitialBalance = BigNumber(initialBalance)
              let bnFundingValue = BigNumber(fundingValue)
              let bnNewBalance = BigNumber(newBalance)
              let bnResult = bnInitialBalance.plus(bnFundingValue)
              assert.equal(bnNewBalance.toFixed(), bnResult.toFixed(), "Funds have not been transfered")

              truffleAssert.prettyPrintEmittedEvents(result, 2)
          })
      
          it("firstAirline can register another airline after the fund has been paid", async () => {
              let newAirline = accounts[2];
              await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
            //   assert.isTrue(await config.flightSuretyData.isAirline.call(accounts[2]), 
            //               "the accounts[2] has not been registered as an airline");
      
            //   let result = await config.flightSuretyData.countAirlines.call()
            //   assert.equal(result.toNumber(), 2, "count of airlines does not match")
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
              let fundingValue = web3.utils.toWei('10.1', 'ether')
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
            let result = await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime, {from: config.firstAirline})
            truffleAssert.eventEmitted(result, 'FlightRegistered') 
        })

        it("can read flight information", async () => {
            let flightNumber = "FL200"
            let flightTime = Math.floor(Date.now() / 1000) + 10000
            await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime, {from: config.firstAirline})
            let flightKey = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumber, flightTime)
            let readFlight = await config.flightSuretyData.flights.call(flightKey)

            // console.log("££££££££££")
            // console.log(readFlight)
            // console.log("££££££££££")

            // assert.include(readFlight, config.firstAirline)
            // assert.include(readFlight, "FL200")
            assert.equal(readFlight[3].toNumber(), flightTime)
        })
    })

})

describe("Passengers Tests", () => {
    let flights = []
    
    it("can set up seed data", async () => {
        let flightKey
        let fundingValue = web3.utils.toWei('10.1', 'ether')
        // let newAirline1 = accounts[2];
        // let newAirline2 = accounts[3];
        await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue})
        // await config.flightSuretyApp.registerAirline(newAirline1, {from: config.firstAirline});
        // await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        // await config.flightSuretyApp.payFunding({from: newAirline1, value: fundingValue})
        // await config.flightSuretyApp.payFunding({from: newAirline2, value: fundingValue})

        let flightNumber = "FL300"
        let flightTime = Math.floor(Date.now() / 1000) + 10000
        await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime, {from: config.firstAirline})
        await config.flightSuretyApp.registerFlight(config.firstAirline, "FlightTooOld", 100, {from: config.firstAirline})
        flightKey = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumber, flightTime)
        
        let readFlight = await config.flightSuretyData.flights.call(flightKey)
        
        // assert.include(readFlight, config.firstAirline)
        // assert.include(readFlight, "FL300")
        assert.equal(readFlight[3].toNumber(), flightTime)

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
        // console.log(`All flights: ${JSON.stringify(flights[2])}`)
        // console.log(`All 3: ${JSON.stringify(flights[3])}`)
        assert.equal(flights.length, 4, "flights should contain 4 items")
        assert.include(JSON.stringify(flights[2]), "FL300")
        assert.include(JSON.stringify(flights[3]), "FlightTooOld")
    })

    it("can get one flight using the getter", async () => {
        let flight = await config.flightSuretyData.getFlight.call(flights[2][0])
        assert.include(JSON.stringify(flight), "FL300")
    })

    it("can get the time of a flight", async () => {
        let flightTime = await config.flightSuretyData.getFlightTime.call(flights[3][0])
        assert.equal(flightTime.toNumber(), 100, "Flight time not as expected")
    })

    it("can buy insurance only for existing flight", async () => {
        let flightKeyOk = flights[0][0]
        let falseFlightKey = await config.flightSuretyData.getFlightKey.call(config.firstAirline, "123456789", 1234567)

        let passenger1 = accounts[11]
        let amount = web3.utils.toWei('0.2345', 'ether')
        
        let existingFlight = await config.flightSuretyApp.buyInsurance(flightKeyOk, {from: passenger1, value: amount})
        await truffleAssert.eventEmitted(existingFlight, 'InsuranceBought') 
        
        await truffleAssert.fails(
            config.flightSuretyApp.buyInsurance(falseFlightKey, {from: passenger1, value: amount}), 
            truffleAssert.ErrorType.REVERT, "The flightKey does not exist"
        )
    })
    
    it("can view all insurances bought for a specific flight", async () => {
        let insurances = []
        let flightKey1 = flights[0][0]
        let amount1 = web3.utils.toWei('0.1111', 'ether')
        let amount2 = web3.utils.toWei('0.2222', 'ether')
        let passenger1 = accounts[12]
        let passenger2 = accounts[13]

        await config.flightSuretyApp.buyInsurance(flightKey1, {from: passenger1, value: amount1})
        await config.flightSuretyApp.buyInsurance(flightKey1, {from: passenger2, value: amount2})
        
        let insurancesSize = await config.flightSuretyData.insurancesSize.call(flightKey1)

        for(i = 0; i < insurancesSize; i++){
            let insurance = await config.flightSuretyData.getInsuranceForIndex.call(flightKey1, i)
            insurances.push(insurance)
        }

        // console.log(`InsurancesSize: ${insurancesSize}`)
        // console.log(`Insurances: ${JSON.stringify(insurances)}`)
        
        assert.isArray(insurances)
        assert.nestedInclude(JSON.stringify(insurances[1]), passenger1)
        assert.include(JSON.stringify(insurances[2]), passenger2)
    })
    
    it("can't buy insurance for old flights", async () => {
        let flightKeyOld = flights[3][0]
        let amount = web3.utils.toWei('0.2345', 'ether')
        let passenger1 = accounts[12]
        await truffleAssert.fails(
            config.flightSuretyApp.buyInsurance(flightKeyOld, {from: passenger1, value: amount}), 
            truffleAssert.ErrorType.REVERT, 
            "The flight is too old"
            )
    })

    it("can buy insurance for max amount of 1 eth", async () => {
        let flightKey1 = flights[0][0]
        let amountTooHigh = web3.utils.toWei('5.2', 'ether')
        let passenger3 = accounts[14]
        await truffleAssert.fails(
            config.flightSuretyApp.buyInsurance(flightKey1, {from: passenger3, value: amountTooHigh}), 
            truffleAssert.ErrorType.REVERT, 
            "Maximum admitted value overstepped"
            )
    })
    
    // it("can receive credit when flight is delayed", async () => {
    //     // credit received when flight delayed
    //     // credit not received when flight on time
    // })

    // it("can withdraw funds owed from insurance payout", async () => {
    //     // true for flight delayed
    // })
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
    
      it(`(multiparty) can allow access to setOperational() for Contract Owner account`, async function () {
    
          // Ensure that access is allowed for Contract Owner account
          let accessDenied = false;
          try 
          {
              await config.flightSuretyData.setOperational(false);
          }
          catch(e) {
              accessDenied = true;
          }
          assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
          
      });
    
      it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    
          await config.flightSuretyData.setOperational(false);
    
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
          await config.flightSuretyData.setOperational(true);
    
      });
  })




 

});
