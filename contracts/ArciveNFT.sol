// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ArciveNFT is ERC721 {
    using Strings for uint256;
    using Strings for address;

    IERC20 public immutable usdc;

    struct Receipt {
        address payer;
        address payee;
        uint256 amount;      // USDC (6 decimals)
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

    constructor(address usdcAddress) ERC721("Arcive Proof of Payment", "ARCIVE") {
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

        // Mint NFT proof directly to payer in the same transaction
        _safeMint(msg.sender, id);

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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Receipt memory r = _receipts[tokenId];

        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name": "Arcive Receipt #',
                    tokenId.toString(),
                    '", "description": "Deterministic Proof of Payment on Arc Network", "attributes": [',
                    '{"trait_type": "Payer", "value": "',
                    r.payer.toHexString(),
                    '"}, {"trait_type": "Payee", "value": "',
                    r.payee.toHexString(),
                    '"}, {"trait_type": "Amount USDC", "value": "',
                    (r.amount / 1e6).toString(),
                    '"}, {"trait_type": "Category", "value": "',
                    r.category,
                    '"}, {"trait_type": "Note", "value": "',
                    r.note,
                    '"}], "image_data": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 400 400\\"><rect width=\\"400\\" height=\\"400\\" fill=\\"#f8ef88\\"/><rect x=\\"20\\" y=\\"20\\" width=\\"360\\" height=\\"360\\" fill=\\"#ffffff\\" stroke=\\"#111111\\" stroke-width=\\"6\\"/><text x=\\"40\\" y=\\"70\\" font-size=\\"24\\" font-weight=\\"900\\" fill=\\"#111111\\">ARCIVE PROOF</text><text x=\\"40\\" y=\\"110\\" font-size=\\"16\\" font-weight=\\"bold\\" fill=\\"#111111\\">RECEIPT #',
                    tokenId.toString(),
                    '</text><text x=\\"40\\" y=\\"170\\" font-size=\\"14\\" fill=\\"#444444\\">CATEGORY: ',
                    r.category,
                    '</text><text x=\\"40\\" y=\\"220\\" font-size=\\"14\\" fill=\\"#444444\\">NOTE: ',
                    r.note,
                    '</text><text x=\\"40\\" y=\\"320\\" font-size=\\"12\\" font-weight=\\"bold\\" fill=\\"#111111\\">VERIFIED ON ARC NETWORK</text></svg>"}'
                )
            )
        );

        return string.concat("data:application/json;base64,", json);
    }
}
