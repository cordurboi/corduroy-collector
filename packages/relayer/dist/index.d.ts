export type MintArgs = {
    to: string;
    tokenURI: string;
    artId: string;
};
export declare class Relayer {
    private provider;
    private signer;
    private contract;
    constructor(params: {
        rpcUrl: string;
        privateKey: string;
        contractAddress: string;
        artifactsRoot?: string;
    });
    mintNft(args: MintArgs): Promise<{
        txHash: string;
        tokenId: string;
    }>;
    computeTokenId(to: string, artId: string): string;
    getOwnerOf(tokenId: string): Promise<string | null>;
}
export declare function toBytes32(input: string): string;
export declare class Relayer1155 {
    private provider;
    private signer;
    private contract;
    constructor(params: {
        rpcUrl: string;
        privateKey: string;
        contractAddress: string;
        artifactsRoot?: string;
    });
    mintEdition(args: {
        to: string;
        id: bigint | number | string;
    }): Promise<{
        txHash: string;
    }>;
    balanceOf(to: string, id: bigint | number | string): Promise<bigint>;
}
