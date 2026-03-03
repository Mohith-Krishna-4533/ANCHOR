pragma solidity ^0.8.20;

contract AlertRegistry
{

    struct Alert{
        bytes32 eventHash;
        bytes32 entityHash;
        string institution;
        uint256 timestamp;
    }

    Alert[] public alerts;

    event AlertLogged(
        uint256 alertIndex,
        bytes32 eventHash,
        bytes32 entityHash,
        string institution,
        uint256 timestamp
    );

    function logAlert(
        bytes32 _eventHash,
        bytes32 _entityHash,
        string memory _institution
    ) external {

        alerts.push(
            Alert(
                _eventHash,
                _entityHash,
                _institution,
                block.timestamp
            )
        );

        emit AlertLogged(
            alerts.length - 1,
            _eventHash,
            _entityHash,
            _institution,
            block.timestamp
        );
    }

    function totalAlerts() external view returns (uint256) {
        return alerts.length;
    }
}