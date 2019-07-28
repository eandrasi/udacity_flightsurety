pragma solidity >=0.4.21 <0.6.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    // mapping(address => bool) private authorizedCallers;

    struct Airline {
        bool isRegistered;
        bool hasPaid;
    }

    struct Flight {
        bytes32 flightKey;
        address airline;
        string flightNumber;
        uint flightTime;
    }

    struct Insurance {
        address insured;
        uint amountPaid;
        uint balance;
    }

    mapping(address => Airline) public airlines;
    mapping(bytes32 => Flight) public flights;
    mapping(bytes32 => Insurance[]) public insurances;  //must restrict access modifier

    bytes32[] public flightKeys;

    uint public countAirlines;
    uint public operationalAirlinesCount;                    //Airlines that also paid the funding
    mapping(address => bool) public operationalAirlines;
    address public firstAirline;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event NewAirlineRegistered(address registrator, address newAirline);
    // event DataAirlinePaidFunding(address airlineAddress);
    event OperationalDataStateChanged(bool operational);
    event InsuranceCredited(address insured,uint balance);
    event InsuranceHasBeenPaid(bytes32 flightKey, address insuredClient, uint amount);

    // event RegisteredFlight(address airline, string flightNumber, uint flightTime, bytes32 flightKey);


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor (address _firstAirline) public {
        contractOwner = msg.sender;
        firstAirline = _firstAirline;
        countAirlines = 1;
        operationalAirlinesCount = 0;               // it must still pay the fund
        airlines[firstAirline].isRegistered = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    // modifier authorizedCallersOnly() {
    //     require(authorizedCallers[msg.sender] == true, "This address has not been authorized yet");
    //     _;
    // }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */

    function setOperational(bool operating)
                            public
                            requireContractOwner
    {
        operational = operating;
        emit OperationalDataStateChanged(operational);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function payFunding(address fundingAddress)
                public
                requireIsOperational
                payable
                {
                    airlines[fundingAddress].hasPaid = true;
                    operationalAirlinesCount++;
                    operationalAirlines[fundingAddress] = true;
                    // authorizedCallers[fundingAddress] = true;
                    // emit DataAirlinePaidFunding(fundingAddress);
                }

    function authorizeCaller
                            ( address _address
                            )
                            external
                            pure
    {}

    function isAirline (address airlineAddress) external requireIsOperational returns(bool _valid) {
        _valid = airlines[airlineAddress].isRegistered;
    }

    function isRegistered (address airlineAddress) external view returns(bool _valid) {
        _valid = airlines[airlineAddress].isRegistered;
    }

    function isAirlineOperational (address airlineAddress) external view returns(bool _valid) {
        _valid = operationalAirlines[airlineAddress];
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
                            (   address newAirline,
                                address registrator
                            )
                            external
                            requireIsOperational
                            // authorizedCallersOnly
    {
        countAirlines++;
        airlines[newAirline].isRegistered = true;
        emit NewAirlineRegistered(registrator, newAirline);
    }

    function registerFlight(address airline, string calldata flightNumber, uint flightTime)
    external requireIsOperational /*requireCallerAuthorized*/ {
        // bytes32 flightKey = keccak256(abi.encodePacked(flightNumber, flightTime));
        bytes32 flightKey = getFlightKey(airline, flightNumber, flightTime);
        Flight memory newFlight = Flight(flightKey, airline, flightNumber, flightTime);
        flights[flightKey] = newFlight;
        flightKeys.push(flightKey);

        // emit RegisteredFlight(airline, flightNumber, flightTime, flightKey);
    }

    function flightKeysSize() public returns (uint size) {
        size = flightKeys.length;
    }

    function getFlightTime(bytes32 flightKey) public returns(uint flightTime) {
        flightTime = flights[flightKey].flightTime;
    }

    function getFlight(bytes32 _flightKey) public returns
        (bytes32 flightKey, address airline, string memory flightNumber, uint flightTime)
        {
            flightKey = flights[_flightKey].flightKey;
            airline = flights[_flightKey].airline;
            flightNumber = flights[_flightKey].flightNumber;
            flightTime = flights[_flightKey].flightTime;
        }

   /**
    * @dev Buy insurance for a flight
    *
    */
    function buyInsurance (address insured, bytes32 flightKey, uint amount)
                            external
                            requireIsOperational
                            payable
                            {
                                Insurance memory newInsurance = Insurance(insured, amount, 0);
                                insurances[flightKey].push(newInsurance);
                            }
    function getInsuranceForIndex(bytes32 flightKey, uint index) external requireIsOperational
     returns (address insured, uint amountPaid, uint balance) {
        insured = insurances[flightKey][index].insured;
        amountPaid = insurances[flightKey][index].amountPaid;
        balance = insurances[flightKey][index].balance;
    }

    function insurancesSize (bytes32 flightKey) public returns (uint size) {
        size = insurances[flightKey].length;
    }

    function setBalanceForInsurance(bytes32 flightKey, uint index, uint balance) external requireIsOperational {
        insurances[flightKey][index].balance = balance;
        address insured = insurances[flightKey][index].insured;
        emit InsuranceCredited(insured, balance);
    }

    // /**
    //  *  @dev Credits payouts to insurees
    // */
    // function creditInsurees
    //                             (
    //                             )
    //                             external
    //                             pure
    // {
    // }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(bytes32 flightKey, address payable insuredClient) external requireIsOperational {

        // loop through insurances for this flight key
        uint size = insurancesSize(flightKey);

        for(uint i = 0; i < size; i++) {
        //if you find an insurance with insured as the insured property same as the caller
            if(insurances[flightKey][i].insured == insuredClient) {
                uint amountToWithdraw = insurances[flightKey][i].balance;
                insurances[flightKey][i].balance = 0;
                insuredClient.transfer(amountToWithdraw);
                emit InsuranceHasBeenPaid(flightKey, insuredClient, amountToWithdraw);
            }

        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
                            (
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        public
                        pure
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}

