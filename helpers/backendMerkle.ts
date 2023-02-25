import {keccak256} from "hardhat/internal/util/keccak";
import {MerkleTree} from "merkletreejs";
import Web3 from "web3";

const web3 = new Web3();

export default class BackendMerkle {
    constructor(args: {address: string, amount: number}[]) {
        this.tree = createMerkleTree(args);

        this.root = this.tree.getHexRoot();
    }

    tree: MerkleTree
    root: string
    // @ts-ignore
    getProof (address: string, amount: number) {
        const amountEncode = web3.eth.abi.encodeParameter("uint256", amount);

        const node = keccak256(Buffer.concat(
            [
                Buffer.from(address.replace("0x", ""), "hex"),
                Buffer.from(amountEncode.replace("0x", ""), "hex")
            ])
        );

        return  this.tree.getHexProof(node);
    }
}

const createMerkleTree = (args: {address: string, amount: number}[]) => {
    const leafs = args.map(arg => keccak256(Buffer.concat(
            [
                Buffer.from(arg.address.replace("0x", ""), "hex"),
                Buffer.from(web3.eth.abi.encodeParameter("uint256", arg.amount).replace("0x", ""), "hex")
            ])
        )
    );

    return new MerkleTree(leafs, keccak256, {sortPairs: true});
}