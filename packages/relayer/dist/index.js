"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Relayer1155 = exports.Relayer = void 0;
exports.toBytes32 = toBytes32;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Relayer {
    constructor(params) {
        const { rpcUrl, privateKey, contractAddress, artifactsRoot } = params;
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        const abiPath = path_1.default.resolve(artifactsRoot || path_1.default.join(process.cwd(), 'packages', 'contracts'), 'artifacts/contracts/Collectible.sol/Collectible.json');
        const abiJson = JSON.parse(fs_1.default.readFileSync(abiPath, 'utf-8'));
        this.contract = new ethers_1.ethers.Contract(contractAddress, abiJson.abi, this.signer);
    }
    async mintNft(args) {
        const { to, tokenURI } = args;
        const artIdBytes32 = toBytes32(args.artId);
        const tx = await this.contract.mintTo(to, artIdBytes32, tokenURI);
        const receipt = await tx.wait();
        const iface = this.contract.interface;
        let tokenId;
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed?.name === 'Collected') {
                    tokenId = (parsed.args?.tokenId).toString();
                    break;
                }
            }
            catch (_) {
                // skip non-matching logs
            }
        }
        return { txHash: receipt.hash, tokenId: tokenId ?? '0' };
    }
    computeTokenId(to, artId) {
        const artIdBytes32 = toBytes32(artId);
        // Solidity uses keccak256(abi.encodePacked(address, bytes32))
        const hash = ethers_1.ethers.solidityPackedKeccak256(['address', 'bytes32'], [to, artIdBytes32]);
        // Return as decimal string for consistency with tokenId event parsing
        return BigInt(hash).toString();
    }
    async getOwnerOf(tokenId) {
        try {
            const owner = await this.contract.ownerOf(BigInt(tokenId));
            return owner;
        }
        catch (e) {
            // If token does not exist, OZ ownerOf reverts; treat as no owner
            return null;
        }
    }
}
exports.Relayer = Relayer;
function toBytes32(input) {
    // If it's already a 0x-prefixed 32-byte hex string
    if (/^0x[0-9a-fA-F]{64}$/.test(input))
        return input;
    // Otherwise, hash the utf8 string
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(input));
}
// ---------------- ERC-1155 Relayer (Editions) ----------------
class Relayer1155 {
    constructor(params) {
        const { rpcUrl, privateKey, contractAddress, artifactsRoot } = params;
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        const abiPath = path_1.default.resolve(artifactsRoot || path_1.default.join(process.cwd(), 'packages', 'contracts'), 'artifacts/contracts/Collectible1155.sol/Collectible1155.json');
        const abiJson = JSON.parse(fs_1.default.readFileSync(abiPath, 'utf-8'));
        this.contract = new ethers_1.ethers.Contract(contractAddress, abiJson.abi, this.signer);
    }
    async mintEdition(args) {
        const { to, id } = args;
        const tx = await this.contract.mintTo(to, BigInt(id));
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }
    async balanceOf(to, id) {
        const bal = await this.contract.balanceOf(to, BigInt(id));
        return bal;
    }
}
exports.Relayer1155 = Relayer1155;
