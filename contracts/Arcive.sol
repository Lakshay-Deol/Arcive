// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract Arcive {
    IERC20 public immutable usdc;

    struct Receipt {
        address payer;
        address payee;
        uint256 amount;      // in the token's smallest unit (USDC 6 decimals)
        string category;
        string note;
        uint64 timestamp;
    }

    Receipt[] private _receipts;
    mapping(address => uint256[]) private _byPayer;
    mapping(address => uint256[]) private _byPayee;

    uint256 public constant MAX_TEXT = 140;

    event Paid(
        uint256 indexed id,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string category,
        string note
    );

    constructor(address usdcAddress) {
        usdc = IERC20(usdcAddress);
    }

    function pay(
        address payee,
        uint256 amount,
        string calldata category,
        string calldata note
    ) external returns (uint256 id) {
        require(payee != address(0), "bad payee");
        require(amount > 0, "zero amount");
        require(bytes(category).length <= MAX_TEXT, "category too long");
        require(bytes(note).length <= MAX_TEXT, "note too long");

        require(usdc.transferFrom(msg.sender, payee, amount), "transfer failed");

        id = _receipts.length;
        _receipts.push(Receipt(msg.sender, payee, amount, category, note, uint64(block.timestamp)));
        _byPayer[msg.sender].push(id);
        _byPayee[payee].push(id);

        emit Paid(id, msg.sender, payee, amount, category, note);
    }

    function getReceipt(uint256 id) external view returns (Receipt memory) {
        require(id < _receipts.length, "invalid id");
        return _receipts[id];
    }

    function idsByPayer(address a) external view returns (uint256[] memory) {
        return _byPayer[a];
    }

    function idsByPayee(address a) external view returns (uint256[] memory) {
        return _byPayee[a];
    }

    function totalReceipts() external view returns (uint256) {
        return _receipts.length;
    }
}
