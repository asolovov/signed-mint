import {expect} from "chai";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import BackendMerkle from "../helpers/backendMerkle";
import BackendECDSA from "../helpers/backendECDSA";

describe("ERC721 unit tests", function () {
    const Name = "SignedMint";
    const Symbol = "SMI";

    async function deploySignedMintFixture() {
        const [owner, address1, address2, address3] = await ethers.getSigners();
        const price = ethers.utils.parseEther("0.01");

        const allowListForMerkel = [
            {address: address1.address, amount: 1},
            {address: address2.address, amount: 1}
        ]

        const allowListECDSA = [address1.address, address2.address]

        const badAllowListECDSA = [address3.address]

        const backendMerkle = new BackendMerkle(allowListForMerkel);
        const root = backendMerkle.root;

        const backendSign = new BackendECDSA(owner, allowListECDSA);
        const badBackendSign = new BackendECDSA(address3, badAllowListECDSA);

        const SignedMint = await ethers.getContractFactory("SignedMint");
        const signedMint = await SignedMint.deploy(Name, Symbol, price, root);

        return {signedMint, owner, address1, address2, address3, root, price, backendMerkle, backendSign, badBackendSign};
    }

    describe("Deployment", function () {
        it("Should deploy with proper address", async function () {
            const {signedMint} = await loadFixture(deploySignedMintFixture);

            expect(signedMint.address).to.be.properAddress;
        });

        it("Should have right name", async function () {
            const {signedMint} = await loadFixture(deploySignedMintFixture);

            expect(await signedMint.name()).to.equal(Name);
        });

        it("Should have right symbol", async function () {
            const {signedMint} = await loadFixture(deploySignedMintFixture);

            expect(await signedMint.symbol()).to.equal(Symbol);
        });

        it("Should have right price", async function () {
            const {signedMint, price} = await loadFixture(deploySignedMintFixture);

            expect(await signedMint.price()).to.equal(price);
        });
    });

    describe("Mint with Merkle", async function () {

        it("Should mint token to address1", async function () {
            const {signedMint, address1, backendMerkle, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;

            const proof = backendMerkle.getProof(address1.address, amount);

            await signedMint.connect(address1).signedMintMerkle(1, proof, {value: price.mul(amount)});
            expect(await signedMint.ownerOf(0)).to.equal(address1.address);
        });

        it("Should mint token to address2", async function () {
            const {signedMint, address2, backendMerkle, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;

            const proof = backendMerkle.getProof(address2.address, amount);

            await signedMint.connect(address2).signedMintMerkle(1, proof, {value: price.mul(amount)});
            expect(await signedMint.ownerOf(0)).to.equal(address2.address);
        });

        it("Should not mint token if amount is invalid", async function () {
            const {signedMint, address1, backendMerkle, price} = await loadFixture(deploySignedMintFixture);
            const amount = 2;

            const proof = backendMerkle.getProof(address1.address, amount);

            const tx = signedMint.connect(address1).signedMintMerkle(1, proof, {value: price.mul(amount)});
            await expect(tx).to.be.revertedWith("Signed mint: proof is invalid");
        });

        it("Should not mint token if address is not listed", async function () {
            const {signedMint, address3, backendMerkle, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;

            const proof = backendMerkle.getProof(address3.address, amount);

            const tx = signedMint.connect(address3).signedMintMerkle(1, proof, {value: price.mul(amount)});
            await expect(tx).to.be.revertedWith("Signed mint: proof is invalid");
        });
    });

    describe("Mint with ECDSA", async function () {

        it("Should mint 1 token", async function () {
            const {signedMint, address1, backendSign, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;

            const response = await backendSign.checkAndSign(address1.address, amount);

            expect(response.ok).to.equal(true);

            if (response.ok && response.hash) {
                await signedMint.connect(address1)
                    .signedMintECDSA(amount, response.hash, response.sign, {value: price.mul(amount)});

                expect(await signedMint.ownerOf(0)).to.equal(address1.address);
            }
        });

        it("Should mint several tokens", async function () {
            const {signedMint, address1, backendSign, price} = await loadFixture(deploySignedMintFixture);
            const amount = 3;

            const response = await backendSign.checkAndSign(address1.address, amount);

            expect(response.ok).to.equal(true);

            if (response.ok && response.hash) {
                await signedMint.connect(address1)
                    .signedMintECDSA(amount, response.hash, response.sign, {value: price.mul(amount)});

                expect(await signedMint.ownerOf(0)).to.equal(address1.address);
                expect(await signedMint.ownerOf(1)).to.equal(address1.address);
                expect(await signedMint.ownerOf(2)).to.equal(address1.address);
            }
        });

        it("Should mint several tokens for several callers", async function () {
            const {signedMint, address1, address2, backendSign, price} = await loadFixture(deploySignedMintFixture);
            const amount = 3;

            const response1 = await backendSign.checkAndSign(address1.address, amount);
            const response2 = await backendSign.checkAndSign(address2.address, amount);

            expect(response1.ok).to.equal(true);
            expect(response2.ok).to.equal(true);

            if (response1.ok && response1.hash && response2.ok && response2.hash) {
                await signedMint.connect(address1)
                    .signedMintECDSA(amount, response1.hash, response1.sign, {value: price.mul(amount)});

                await signedMint.connect(address2)
                    .signedMintECDSA(amount, response2.hash, response2.sign, {value: price.mul(amount)});

                expect(await signedMint.ownerOf(0)).to.equal(address1.address);
                expect(await signedMint.ownerOf(1)).to.equal(address1.address);
                expect(await signedMint.ownerOf(2)).to.equal(address1.address);
                expect(await signedMint.ownerOf(3)).to.equal(address2.address);
                expect(await signedMint.ownerOf(4)).to.equal(address2.address);
                expect(await signedMint.ownerOf(5)).to.equal(address2.address);
            }
        });

        it("Should not mint token if sign is invalid", async function () {
            const {signedMint, address3, badBackendSign, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;

            const response = await badBackendSign.checkAndSign(address3.address, amount);

            expect(response.ok).to.equal(true);

            if (response.ok && response.hash) {
                const tx = signedMint.connect(address3)
                    .signedMintECDSA(amount, response.hash, response.sign, {value: price.mul(amount)});

                await expect(tx).to.be.revertedWith("Signed mint: signature is not valid");
            }
        });

        it("Should not mint token if message is invalid", async function () {
            const {signedMint, address1, backendSign, price} = await loadFixture(deploySignedMintFixture);
            const amount = 1;
            const badAmount = 2;

            const response = await backendSign.checkAndSign(address1.address, amount);

            expect(response.ok).to.equal(true);

            if (response.ok && response.hash) {
                const tx = signedMint.connect(address1)
                    .signedMintECDSA(badAmount, response.hash, response.sign, {value: price.mul(badAmount)});

                await expect(tx).to.be.revertedWith("Signed mint: message is not valid");
            }
        });
    });
});