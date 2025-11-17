// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Collectible
/// @notice ERC-721 that mints one token per (user, artId) pair by using a deterministic tokenId.
///         tokenId = uint256(keccak256(abi.encodePacked(to, artId))).
contract Collectible is ERC721, Ownable {
    using Strings for uint256;

    // tokenId => tokenURI
    mapping(uint256 => string) private _tokenURIs;

    event Collected(address indexed to, bytes32 indexed artId, uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// @notice Computes the deterministic tokenId for a recipient and artId.
    function computeTokenId(address to, bytes32 artId) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(to, artId)));
    }

    /// @notice Mint a token for a specific recipient and artId with a provided tokenURI.
    /// @dev Reverts if token for (to, artId) already exists.
    function mintTo(address to, bytes32 artId, string memory tokenURI_) external onlyOwner returns (uint256 tokenId) {
        tokenId = computeTokenId(to, artId);
        require(_ownerOf(tokenId) == address(0), "ALREADY_COLLECTED");
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit Collected(to, artId, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "URI_QUERY_FOR_NONEXISTENT");
        return _tokenURIs[tokenId];
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        require(_ownerOf(tokenId) != address(0), "SETURI_NONEXISTENT");
        _tokenURIs[tokenId] = _tokenURI;
    }
}
