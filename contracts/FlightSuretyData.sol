pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(address => bool) private authorizedCallers;

    struct Airline {
        bool isRegistered;
        bool hasPaid;
    }

    struct Flight {
        address airline;
        string flightNumber;
        uint flightTime;
    }

    mapping(address => Airline) public airlines;
    mapping(bytes32 => Flight) public flights;

    uint public countAirlines;
    uint public operationalAirlinesCount;                    //Airlines that also paid the funding
    mapping(address => bool) public operationalAirlines;
    address public firstAirline;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event NewAirlineRegistered(address registrator, address newAirline);
    event AirlinePaidFunding(address airlineAddress);
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

    modifier authorizedCallersOnly() {
        require(authorizedCallers[msg.sender] == true, "This address has not been authorized yet");
        _;
    }

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
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function payFunding(address fundingAddress) 
                public
                // requireIsOperational
                // callerAuthoriyed
                payable
                {
                    airlines[fundingAddress].hasPaid = true;
                    operationalAirlinesCount++;
                    operationalAirlines[fundingAddress] = true;
                    emit AirlinePaidFunding(fundingAddress);
                }

    function authorizeCaller
                            ( address _address  
                            )
                            external
                            pure
    {
    }

    function isAirline (address airlineAddress) external returns(bool _valid) {
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

    function registerFlight(address airline, string flightNumber, uint flightTime) external requireIsOperational /*requireCallerAuthorized*/ {
        Flight memory newFlight = Flight(airline, flightNumber, flightTime);
        // bytes32 flightKey = keccak256(abi.encodePacked(flightNumber, flightTime));
        bytes32 flightKey = getFlightKey(airline, flightNumber, flightTime);
        flights[flightKey] = newFlight;

        // emit RegisteredFlight(airline, flightNumber, flightTime, flightKey);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
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
                        pure
                        public
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

