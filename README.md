# Signed mint

## About
This repository contains smart-contract with signed mint implementation using Merkle Tree and ECDSA
algorithm. Unit tests and back-end simulation methods allow you to explore secured ways to mint tokens
and implement any other methods required signing.

## Getting started
Clone this repository and run following commands to install all dependencies and sure that smart-contract
is working as expected.

```bash
yarn install
npx hardhat test
```

## Usage
See comments in `SignedMint.sol` contract and logic in test file `SignedMint.ts` and back-end simulation
helpers `backendMerkle.ts` `backendECDSA.ts`.

### Merkle
TODO: description

### ECDSA
ECDSA - Elliptic Curve Digital Signature Algorithm. Allows to sign message that contains different args
and verify sign and message args on contract side. In this example we use contract owner as only
valid signer and message arguments - caller `address` and tokens `amount` to mint. Full algorithm
implementation follows next steps:

1. Front-end app receives arguments from user, for example `address` and `amount` and sends args to
   back-end for verification
2. Back-end verify arguments and if they are valid makes hashed message and signs it with owners
   secret key.

Encoding `amount` to Application Binary Interface:
```ts
const amountBN = web3.eth.abi.encodeParameter("uint256", amount.toString());
```
Creating hashed message from given arguments using `keccak256` hash function:
```ts
const messageHash = keccak256(Buffer.concat(
    [
        Buffer.from(user.replace("0x", ""), "hex"),
        Buffer.from(amountBN.replace("0x", ""), "hex")
    ])
);
```
Hashed message transforming into bytes and signing it:
```ts
const messageBytes = ethers.utils.arrayify(messageHash);
const sign = await this.owner.signMessage(messageBytes);
```

3. Front-end receives hashed message and signature and use it for calling smart-contract `mint` method
   along with `amount` argument
4. Smart-contract verify signature and message and if they are valid - mints tokens to caller

This is a `mint` function that uses signature and message hash to verify the operation:
```solidity
function signedMintECDSA(uint256 amount, bytes32 message, bytes calldata signature) external payable {
    require(_checkSignature(message, signature), "Signed mint: signature is not valid");
    require(_checkMessage(message, address(msg.sender), amount), "Signed mint: message is not valid");
    require(msg.value == _price * amount, "Signed mint: not enough funds");

    _mintTo(msg.sender, amount);
}
```
We verify signature using `ECDSA.recover` method from Open Zeppelin ECDSA.sol smart-contract
and by comparing recovered address and owner address:
```solidity
function _recoverSigner(bytes32 message, bytes calldata signature) internal pure returns (address) {
    bytes32 messageDigest = keccak256(
        abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            message
        )
    );
    return ECDSA.recover(messageDigest, signature);
}

function _checkSignature(bytes32 message, bytes calldata signature) internal view returns (bool) {
    return _recoverSigner(message, signature) == owner();
}
```
We verify message hash by comparing received hash and hash that we generate in smart-contract
method also using `keccak256` hash function.
```solidity
function _checkMessage(bytes32 message, address caller, uint256 amount) internal pure returns(bool) {
    return message == keccak256(abi.encodePacked(caller, amount));
}
```
