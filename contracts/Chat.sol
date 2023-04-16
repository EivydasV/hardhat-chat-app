//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

contract Chat {
    mapping(address => User) public users;
    AllUsers[] public allUsers;
    mapping(bytes32 => Message[]) public messages;

    struct AllUsers {
        address pubKey;
        string name;
    }

    struct User {
        string name;
        Friend[] friends;
    }

    struct Friend {
        address pubKey;
        string name;
    }

    struct Message {
        address sender;
        string message;
        uint256 timestamp;
    }

    event Name();

    function checkIfUserExist(address _pubKey) public view returns (bool) {
        return bytes(users[_pubKey].name).length > 0;
    }

    function checkIfAlreadyFriends(
        address _pubKey1,
        address _pubKey2
    ) internal view returns (bool) {
        for (uint i = 0; i < users[_pubKey1].friends.length; i++) {
            if (users[_pubKey1].friends[i].pubKey == _pubKey2) {
                return true;
            }
        }

        return false;
    }

    function _addFriend(
        address _pubKey1,
        address _pubKey2,
        string memory _name
    ) internal {
        users[_pubKey1].friends.push(Friend(_pubKey2, _name));
    }

    function createUser(string calldata _name) external {
        require(!checkIfUserExist(msg.sender), "User already exist");
        require(bytes(_name).length > 0, "Name is required");
        require(
            bytes(_name).length <= 32,
            "Name cannot be longer than 32 characters"
        );

        users[msg.sender].name = _name;

        allUsers.push(AllUsers(msg.sender, _name));
    }

    function getUserName(
        address _pubKey
    ) external view returns (string memory) {
        require(checkIfUserExist(_pubKey), "User does not exist");
        return users[_pubKey].name;
    }

    function addFriend(address _pubKey, string calldata _name) external {
        require(
            checkIfUserExist(msg.sender),
            "User does not exist. Create an account first."
        );
        require(checkIfUserExist(_pubKey), "Friend does not exist");
        require(msg.sender != _pubKey, "You cannot add yourself as a friend");
        require(
            !checkIfAlreadyFriends(msg.sender, _pubKey),
            "You are already friends"
        );

        _addFriend(msg.sender, _pubKey, _name);
        _addFriend(_pubKey, msg.sender, users[msg.sender].name);
    }

    function getMyFriends() external view returns (Friend[] memory) {
        return users[msg.sender].friends;
    }

    function _getChatCode(
        address _pubKey1,
        address _pubKey2
    ) internal pure returns (bytes32) {
        if (_pubKey1 < _pubKey2) {
            return keccak256(abi.encodePacked(_pubKey1, _pubKey2));
        } else {
            return keccak256(abi.encodePacked(_pubKey2, _pubKey1));
        }
    }

    function sendMessage(address _pubKey, string calldata _message) external {
        require(
            checkIfUserExist(msg.sender),
            "User does not exist. Create an account first."
        );
        require(checkIfUserExist(_pubKey), "Friend does not exist");
        require(
            checkIfAlreadyFriends(msg.sender, _pubKey),
            "You are not friends"
        );
        require(bytes(_message).length > 0, "Message is required");
        require(
            bytes(_message).length <= 256,
            "Message cannot be longer than 256 characters"
        );

        bytes32 chatCode = _getChatCode(msg.sender, _pubKey);
        messages[chatCode].push(Message(msg.sender, _message, block.timestamp));
    }

    function getMessages(
        address _friendKey
    ) external view returns (Message[] memory) {
        require(
            checkIfUserExist(msg.sender),
            "User does not exist. Create an account first."
        );
        require(checkIfUserExist(_friendKey), "Friend does not exist");
        require(
            checkIfAlreadyFriends(msg.sender, _friendKey),
            "You are not friends"
        );

        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);

        return messages[chatCode];
    }

    function getAllUsers() external view returns (AllUsers[] memory) {
        return allUsers;
    }
}
