
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');


contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);

    // Watch contract events
    
  });
  
  describe("Initial Oracles tests", ()=>{
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;
    
    let flightNumber = 'ND1309'; // Course number
    let flightTime = Math.floor(Date.now() / 1000) + 10000
    let flightNumberLate = 'ND1313'; // Course number
    
    let passengerOnTime = accounts[31]
    let passengerLate = accounts[32]
    let amount = web3.utils.toWei('0.100', 'ether')

    let flightKeyOk
    let flightKeyLate

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
      let fundingValue = web3.utils.toWei('10.1', 'ether')
      await config.flightSuretyApp.payFunding({from: config.firstAirline, value: fundingValue})
      let resultOnTime = await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumber, flightTime, {from: config.firstAirline})
      let resultLate = await config.flightSuretyApp.registerFlight(config.firstAirline, flightNumberLate, flightTime, {from: config.firstAirline})
      truffleAssert.eventEmitted(resultOnTime, 'FlightRegistered')
      truffleAssert.eventEmitted(resultLate, 'FlightRegistered')
    })

    it("passengers can buy insurance", async () => {
      flightKeyOk   = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumber, flightTime)
      flightKeyLate = await config.flightSuretyData.getFlightKey.call(config.firstAirline, flightNumberLate, flightTime)

      
      let insuranceOnFlightOk = await config.flightSuretyApp.buyInsurance(flightKeyOk, {from: passengerOnTime, value: amount})
      let insuranceOnFlightLate = await config.flightSuretyApp.buyInsurance(flightKeyLate, {from: passengerLate, value: amount})
      await truffleAssert.eventEmitted(insuranceOnFlightOk, 'InsuranceBought') 
      await truffleAssert.eventEmitted(insuranceOnFlightLate, 'InsuranceBought') 
    })
  
    it('can request flight status, Oracles submit responses', async () => {  
      // Submit a request for oracles to get status information for a flight
      let result = await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flightNumber, flightTime);
      let index = result.logs[0].args.index.toNumber()
      truffleAssert.eventEmitted(result, "OracleRequest")
      // console.log(index)
      // truffleAssert.prettyPrintEmittedEvents(result, 2)


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
            // truffleAssert.prettyPrintEmittedEvents(await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], 
            //                 config.firstAirline, flightNumber, flightTime, STATUS_CODE_ON_TIME, { from: accounts[a] }), 2)
            let flightOnTime = await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flightNumber, 
              flightTime, STATUS_CODE_ON_TIME, { from: accounts[a] })
              
              truffleAssert.eventEmitted(flightOnTime, "OracleReport")
            }
            catch(e) {
              // Enable this when debugging
              // console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightNumber, flightTime);
              // console.log(e)
            }
            
          }
        }  
    })

    it("can request flight status and receive oracle responses for LATE_AIRLINE", async () => {
      await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flightNumberLate, flightTime)

      for(let a=1; a<TEST_ORACLES_COUNT; a++) {
        let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]})

        for(let idx=0;idx<3;idx++) {
          try {
            let flightLateAirline = await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flightNumberLate, 
              flightTime, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] })    
              truffleAssert.eventEmitted(flightLateAirline, "OracleReport")
              truffleAssert.prettyPrintEmittedEvents(flightLateAirline, 2)
            }
            catch(e) {
              // Enable this when debugging
              // console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightNumber, flightTime);
              // console.log(e)
            }
            
          }
        }

    })

    it("can read the insurance information", async () => {
      let insurancesSize = await config.flightSuretyData.insurancesSize.call(flightKeyOk)
      let insurances = []

      for(i = 0; i < insurancesSize; i++){
          let insurance = await config.flightSuretyData.getInsuranceForIndex.call(flightKeyOk, i)
          insurances.push(insurance)
      }
      assert.equal(insurances[0][0], passengerOnTime, "The passenger that bought the insurance is not the insured one")
      assert.equal(insurances[0][1], amount, "The amount is not the same")
      // console.log(BigNumber(insurances[0][2]).toFixed())
      assert.equal(BigNumber(insurances[0][2]).toFixed(), 0, "The balance should be 0")
    })

    it("passengers insured on the LATE_AIRLINE flight have their accounts credited with the amount*1.5", async () => {
      let insurance = await config.flightSuretyData.getInsuranceForIndex.call(flightKeyLate, 0)
      // console.log(flightKeyLate)
      let expectedBalance = web3.utils.toWei('0.150', 'ether')
      assert.equal(insurance[0], passengerLate, "The account is not of the insured passenger")
      assert.equal(insurance[1], amount, "The amount insured is incorrect")
      assert.equal(BigNumber(insurance[2]).toFixed(), expectedBalance, "The balance is incorrect")
      
      // let insurancesSize = await config.flightSuretyData.insurancesSize.call(flightKeyLate)
      // let insurances = []
      // let insuredPassenger
      
      // for(i = 0; i < insurancesSize; i++){
        //     console.log(`Insurance: ${insurance}`)
        //     insurances.push(insurance)
        // }
    })

    it("passengers insured on the LATE_AIRLINE can withdraw the insurance payout", async () => {
      let initialBalance = await web3.eth.getBalance(passengerLate)
      // console.log(`InitialBalance: ${initialBalance}`)
      // console.log(`Account: ${passengerLate}`)

      let a = await config.flightSuretyApp.withdraw(flightKeyLate, {from: passengerLate})

      // truffleAssert.prettyPrintEmittedEvents(a)

      let finalBalance = await web3.eth.getBalance(passengerLate)
      // console.log(`finalBalance: ${finalBalance}`)
      // console.log(`Diference: ${finalBalance - initialBalance}`)
      // console.log(finalBalance)
      // console.log(initialBalance)
      // console.log(BigNumber(finalBalance).toNumber())
      // console.log(BigNumber(initialBalance).toNumber())
      assert.isTrue(BigNumber(finalBalance).toNumber() > BigNumber(initialBalance).toNumber(), "Funds have not been transferred")

    })

  })


 
});
