// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SignedMint is ERC721, Ownable {

    uint256 immutable private _price;

    uint256 private _nextTokenId;

    // Used for Merkle Tree logic. It is a pre-created Tree that contains several hashed messaged with given args
    // such as: address, amount, price, id etc.
    // In our case tree has only to args: address and amount to mint.
    bytes32 public immutable _root;

    constructor(string memory name_, string memory symbol_, uint256 price_, bytes32 root_)
    ERC721(name_, symbol_) {
        _price = price_;
        _root = root_;
    }

    function price() external view returns(uint256) {
        return _price;
    }

    function _mintTo(address to, uint256 amount) internal {
        require(amount > 0, "Signed mint: amount should be more than 0");
        require(to != address(0), "Signed mint: to address can not be zero");

        for (uint256 i = 0; i < amount; i++) {
            _safeMint(msg.sender, _nextTokenId);
            _nextTokenId++;
        }
    }

    ///////////////////////////           ECDSA LOGIC           ///////////////////////////

    /**
     * This method uses ECDSA logic, see {ECDSA} for more technical details.
     * @param message - a hash from given args. In our case they are caller address and amount of tokens to mint.
     * @param signature - byte type signature that is made by Ethereum Sign
     * @param amount - amount of tokens to mint
     */
    function signedMintECDSA(uint256 amount, bytes32 message, bytes calldata signature) external payable {
        require(_checkSignature(message, signature), "Signed mint: signature is not valid");
        require(_checkMessage(message, address(msg.sender), amount), "Signed mint: message is not valid");
        require(msg.value == _price * amount, "Signed mint: not enough funds");

        _mintTo(msg.sender, amount);
    }

    /**
     * Recovers signer address from message hash and signature hash
     * See {ECDSA - recover}
     * @return signer address
     */
    function _recoverSigner(bytes32 message, bytes calldata signature) internal pure returns (address) {
        bytes32 messageDigest = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                message
            )
        );
        return ECDSA.recover(messageDigest, signature);
    }

    /**
     * Compares signer address and owner address. Returns true if signer is owner and false if not
     * Can be used to check different signers, depends on contract logic
     * @return true if signer is owner and false if not
     */
    function _checkSignature(bytes32 message, bytes calldata signature) internal view returns (bool) {
        return _recoverSigner(message, signature) == owner();
    }

    /**
     * Compares message hash from caller and hash from params - caller address and amount to mint
     * Can be used to code any type of data: price, amount, address, id etc.
     * @return true if hashes are equal and false if not
     */
    function _checkMessage(bytes32 message, address caller, uint256 amount) internal pure returns(bool) {
        return message == keccak256(abi.encodePacked(caller, amount));
    }

    ///////////////////////////        MERKLE TREE LOGIC        ///////////////////////////

    /**
     * This method uses Merkle Tree logic, see {MerkleTree} for more technical details.
     * @param proof - an array of hash that is generated using `_root` on backend app. Sort of a signature.
     * @param amount - amount of tokens to mint
     */
    function signedMintMerkle(uint256 amount, bytes32[] calldata proof) external payable {
        require(_validateProof(address(msg.sender), amount, proof), "Signed mint: proof is invalid");
        require(msg.value == _price * amount, "Signed mint: not enough funds");

        _mintTo(msg.sender, amount);
    }

    /**
     * Leaf is one of the elements from pre-created Merkle Tree. It is a hash from given args.
     * Args can be any data: price, amount, address, id etc.
     * @return hash from given arguments
     */
    function _getLeaf(address user, uint256 amount) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(user, amount));
    }

    /**
     * Proof is a sort of a signature used to validate, that given leaf (hashed message) is a part
     * of the pre-created Merkle Tree.
     * See {MerkleProof - verifyCalldata}
     * @return true if proof and leaf are valid and false if not
     */
    function _validateProof(address user, uint256 amount, bytes32[] calldata proof) internal view returns(bool) {
        return MerkleProof.verifyCalldata(proof, _root, _getLeaf(user, amount));
    }

}
