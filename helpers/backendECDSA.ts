import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {keccak256} from "hardhat/internal/util/keccak";
import {ethers} from "hardhat";
import Web3 from "web3";

const web3 = new Web3();

export default class BackendECDSA {
    constructor(owner: SignerWithAddress, allowList: string[]) {
        this.owner = owner

        this.allowList = allowList
    }

    owner: SignerWithAddress
    allowList: string[]
    // @ts-ignore
    async checkAndSign (user: string, amount: number) {

        // In real implementation others checks are required for example amount
        if (this.allowList.includes(user)) {

            // This hash will be compared in the contract
            const amountBN = web3.eth.abi.encodeParameter("uint256", amount.toString());
            const messageHash = keccak256(Buffer.concat(
                [
                    Buffer.from(user.replace("0x", ""), "hex"),
                    Buffer.from(amountBN.replace("0x", ""), "hex")
                ])
            );

            // This sign will be checked in the contract
            const messageBytes = ethers.utils.arrayify(messageHash);
            const sign = await this.owner.signMessage(messageBytes);

            return {hash: messageHash, sign: sign, ok: true};
        } else {
            return {hash: null, sign: null, ok: false}
        }
    }
}