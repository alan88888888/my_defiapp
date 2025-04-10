const { ethers } = require("hardhat");
const addresses = require("../workspace/frontend/src/utils/deployed-addresses.json");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Distributing tokens from:", deployer.address);

    // Get token contracts
    const NewToken = await ethers.getContractFactory("NewToken");
    const token0 = NewToken.attach(addresses.token0);
    const token1 = NewToken.attach(addresses.token1);

    // List of accounts to receive tokens
    const accounts = [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // Account #1
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Account #2
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  // Account #3
        "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",  // Account #4
        "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"   // Account #5
    ];

    // Amount to distribute to each account
    const amount = ethers.parseEther("10000");

    for (const account of accounts) {
        console.log(`Transferring tokens to ${account}...`);
        
        // Transfer ALPHA tokens
        await token0.transfer(account, amount);
        console.log(`Transferred ${ethers.formatEther(amount)} ALPHA tokens`);
        
        // Transfer BETA tokens
        await token1.transfer(account, amount);
        console.log(`Transferred ${ethers.formatEther(amount)} BETA tokens`);
    }

    console.log("Token distribution completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });