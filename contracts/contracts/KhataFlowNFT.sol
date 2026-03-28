// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract KhataFlowNFT is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct DebtRecord {
        string businessId;
        string clientName;
        uint256 amountInPaise;
        uint256 dueDateUnix;
        string invoiceRef;
        bool settled;
        uint256 mintedAt;
    }

    Counters.Counter private _tokenIds;

    mapping(uint256 => DebtRecord) public debtRecords;
    mapping(string => uint256[]) public businessTokens;

    event DebtMinted(
        uint256 indexed tokenId,
        string indexed businessId,
        string clientName,
        uint256 amountInPaise,
        uint256 dueDateUnix,
        string invoiceRef
    );

    event DebtSettled(
        uint256 indexed tokenId,
        address settledBy,
        uint256 settledAt
    );

    constructor() ERC721("KhataFlow RWA Debt", "KHATA") {}

    function mintDebt(
        address to,
        string memory businessId,
        string memory clientName,
        uint256 amountInPaise,
        uint256 dueDateUnix,
        string memory invoiceRef
    ) external returns (uint256) {
        require(to != address(0), "Recipient required");
        require(bytes(clientName).length > 0, "Client name required");
        require(amountInPaise > 0, "Amount must be greater than zero");
        require(dueDateUnix > block.timestamp, "Due date must be in the future");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);

        debtRecords[newTokenId] = DebtRecord({
            businessId: businessId,
            clientName: clientName,
            amountInPaise: amountInPaise,
            dueDateUnix: dueDateUnix,
            invoiceRef: invoiceRef,
            settled: false,
            mintedAt: block.timestamp
        });

        businessTokens[businessId].push(newTokenId);

        emit DebtMinted(
            newTokenId,
            businessId,
            clientName,
            amountInPaise,
            dueDateUnix,
            invoiceRef
        );

        return newTokenId;
    }

    function settleDebt(uint256 tokenId) external {
        address owner = ownerOf(tokenId);

        require(
            owner == msg.sender ||
            getApproved(tokenId) == msg.sender ||
            isApprovedForAll(owner, msg.sender),
            "Not authorized to settle"
        );
        require(!debtRecords[tokenId].settled, "Debt already settled");

        debtRecords[tokenId].settled = true;

        emit DebtSettled(tokenId, msg.sender, block.timestamp);
    }

    function getDebtRecord(uint256 tokenId) external view returns (DebtRecord memory) {
        require(_exists(tokenId), "Token does not exist");
        return debtRecords[tokenId];
    }

    function getBusinessTokens(string memory businessId) external view returns (uint256[] memory) {
        return businessTokens[businessId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }

    function isOverdue(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        DebtRecord memory record = debtRecords[tokenId];
        return !record.settled && block.timestamp > record.dueDateUnix;
    }
}
