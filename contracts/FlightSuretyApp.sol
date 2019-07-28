pragma solidity >=0.4.21 <0.6.0;
// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";



contract FlightSuretyData {
    function registerAirline(address newAirline, address registrator) external;
    function isRegistered(address airlineAddress) external view returns(bool);
    function payFunding(address airlineAddress) external payable;
    function isAirlineOperational (address airlineAddress) external view returns(bool _valid);
    function operationalAirlinesCount() external view returns(uint);
    function registerFlight(address airline, string calldata flightNumber, uint flightTime) external;
    function buyInsurance(address insured, bytes32 flightKey, uint amount) external;
    function getFlightTime(bytes32 flightKey) public returns(uint flightTime);
    function getFlight(bytes32 _flightKey) public returns
        (bytes32 flightKey, address airline, string memory flightNumber, uint flightTime);
    function insurancesSize (bytes32 flightKey) public returns (uint size);
    function getInsuranceForIndex(bytes32 flightKey, uint index) external
            returns (address insured, uint amountPaid, uint balance);
    function setBalanceForInsurance(bytes32 flightKey, uint index, uint balance) external;
    function pay(bytes32 flightKey, address insuredClient) external;
}



/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    FlightSuretyData flightSuretyData;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    bool public isOperational;
    address private contractOwner;          // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    mapping(address => address[]) public votesOnNewRegistration;
    address[] public airlinesAwaitingVotes;


    event FlightRegistered(address airline, string flightNumber, uint flightTime);
    event InsuranceBought(address insured, bytes32 flightKey, uint amount);
    event OperationalAppStateChanged(bool operational);
    event AirlinePaidFunding(address airlineAddress);
    event FlightProcessed(string flight, uint8 statusCode);
    event FlightKey(bytes32 flightKey);

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
         // Modify to call data contract's status
        require(isOperational, "Contract is currently not operational");
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

    modifier registrationPaid() {
        require(flightSuretyData.isRegistered(msg.sender), "The registration fee has not been paid");
        _;
    }

    modifier requireFlightExist(bytes32 _flightKey) {
        (bytes32 flightKey, address airline, string memory flightNumber, uint flightTime) = flightSuretyData.getFlight(_flightKey);
        require(flightKey == _flightKey, "The flightKey does not exist");
        _;
    }

    modifier flightNotExpired(bytes32 _flightKey) {
        (bytes32 flightKey, address airline, string memory flightNumber, uint flightTime) = flightSuretyData.getFlight(_flightKey);
        // uint minimumTime = block.timestamp + 1000;
        // require(flightTime > minimumTime , "The flight is too old");
        require(flightTime > (block.timestamp + 1000) , "The flight is too old");
        _;
    }

    modifier checkValueForMaxAmount() {
        require(msg.value < (1 ether), "Maximum admitted value overstepped");
        _;
    }

    modifier enoughFund() {
        require(msg.value > (10 ether), "You must pay minimum 10 ether for funding");
        _;
    }

    modifier operationalAirline() {
        bool isOpAirline = flightSuretyData.isAirlineOperational(msg.sender);
        require(isOpAirline, "The Airline must be operational to perform these actions");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor ( address dataContract) public
    {
        isOperational = true;
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function setOperational(bool operating)
                            external
                            requireContractOwner
    {
        isOperational = operating;
        emit OperationalAppStateChanged(isOperational);
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/



    function registerAirline (address newAirline)
                external
                requireIsOperational
                operationalAirline
                registrationPaid
                returns(bool/*  success */, uint256/*  votes */)
        {
            if(flightSuretyData.operationalAirlinesCount() < 4) {
                // if less than 4 the caller must be one of the operational airlines
                require(flightSuretyData.isAirlineOperational(msg.sender),
                        "Only operational Airlines can register new airlines");
                flightSuretyData.registerAirline(newAirline, msg.sender);
            } else {
                // we need to vote to give permission
                airlinesAwaitingVotes.push(newAirline);
            }
        }

    function voteAirline(address newAirline) external
                requireIsOperational
                // requireIsRegistered          the address on which to vote has to be registered first

                {
                    bool doubleVote = false;
                    for (uint i = 0; i < votesOnNewRegistration[newAirline].length; i++) {
                        if (votesOnNewRegistration[newAirline][i] == msg.sender) {
                            doubleVote = true;
                            break;
                        }
                    }

                    if(!doubleVote) {
                        votesOnNewRegistration[newAirline].push(msg.sender);
                    }

                    // if more than 50% of the airlines voted, the newAirline will be registered.
                    if(votesOnNewRegistration[newAirline].length > flightSuretyData.operationalAirlinesCount().div(2)) {
                        flightSuretyData.registerAirline(newAirline, msg.sender);
                    }
                }

    function getAirlinesAwaitingVotes () external view requireIsOperational returns (address[] memory airlines) {
        airlines = airlinesAwaitingVotes;
    }

    function getVotesOnNewRegistration(address newAirline) external view requireIsOperational returns(address[] memory votes) {
        votes = votesOnNewRegistration[newAirline];
    }

    function getVotesCount(address newAirline) public view returns (uint count) {
        count = votesOnNewRegistration[newAirline].length;
    }

    function payFunding() external
                // airlineRegistered
                enoughFund
                requireIsOperational
                payable
                {
                    flightSuretyData.payFunding.value(msg.value)(msg.sender);
                    emit AirlinePaidFunding(msg.sender);
                }

    function registerFlight(address airline, string calldata flightNumber, uint flightTime) external requireIsOperational operationalAirline
    {
        flightSuretyData.registerFlight(airline, flightNumber, flightTime);
        emit FlightRegistered(airline, flightNumber, flightTime);
    }

    function buyInsurance(bytes32 flightKey)
                external
                requireIsOperational
                requireFlightExist(flightKey)
                flightNotExpired(flightKey)
                checkValueForMaxAmount
                payable
                {
                    flightSuretyData.buyInsurance(msg.sender, flightKey, msg.value);
                    emit InsuranceBought(msg.sender, flightKey, msg.value);
                }

   /**
    * @dev Called after oracle has updated flight status
    *
    */
    function processFlightStatus(address airline, string memory flight, uint256 timestamp, uint8 statusCode) internal requireIsOperational
    {
        if(statusCode == STATUS_CODE_LATE_AIRLINE) {
            // find all insurances for that flight
            bytes32 flightKey = keccak256(abi.encodePacked(airline, flight, timestamp));
            emit FlightKey(flightKey);
            uint insurancesSize = flightSuretyData.insurancesSize(flightKey);
            //  loop through them and multiply the amount with 1.5
            for(uint i = 0; i < insurancesSize; i++){
                (address insured, uint amountPaid, uint balance) = flightSuretyData.getInsuranceForIndex(flightKey, i);
                balance = amountPaid.mul(15).div(10);
                // newBalance = newBalance.div(10);
                // uint newBalance = (0.15 ether);
                flightSuretyData.setBalanceForInsurance(flightKey, i, balance);
                // flightSuretyData.setBalanceForInsurance(flightKey, i, 56789);
            }

            // credit their balance with the result
        }

        // bytes32 flightKey = keccak256(abi.encodePacked(airline, flight, timestamp));
        // flightSuretyData.setBalanceForInsurance(flightKey, 0, 450);


        emit FlightProcessed(flight, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string calldata flight,
                            uint256 timestamp
                        )
                        external
                        requireIsOperational
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        // bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        bytes32 key = keccak256(abi.encodePacked(airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    }


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    event WithdrawRequested(bytes32 flightKey, address insuredCLient );


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            external
                            view
                            returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    function withdraw(bytes32 flightKey)
    external
    requireIsOperational
    {
        flightSuretyData.pay(flightKey, msg.sender);
        emit WithdrawRequested(flightKey, msg.sender);
    }


    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string calldata flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        // bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        bytes32 key = keccak256(abi.encodePacked(airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        internal
                        pure
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (
                                address account
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}


