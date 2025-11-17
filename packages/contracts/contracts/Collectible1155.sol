// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Collectible1155 is ERC1155, Ownable {
    // Optional relayer role separate from owner
    address public relayer;

    // Optional per-id URIs (overrides base URI when set)
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory baseURI_, address initialOwner) ERC1155(baseURI_) Ownable(initialOwner) {}

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    modifier onlyOwnerOrRelayer() {
        require(msg.sender == owner() || msg.sender == relayer, "not_authorized");
        _;
    }

    // Per-edition URI mapping (easiest for newcomers)
    function setURI(uint256 id, string memory newuri) external onlyOwner {
        _tokenURIs[id] = newuri;
        emit URI(newuri, id);
    }

    function uri(uint256 id) public view override returns (string memory) {
        string memory tok = _tokenURIs[id];
        if (bytes(tok).length > 0) {
            return tok;
        }
        return super.uri(id);
    }

    // One-per-wallet mint; mints exactly amount=1
    function mintTo(address to, uint256 id) external onlyOwnerOrRelayer {
        require(balanceOf(to, id) == 0, "already_collected");
        _mint(to, id, 1, "");
    }
}
