import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  if (balance === 0n) {
    throw new Error('Deployer wallet has no FLOW. Fund it before deployment.');
  }

  console.log('Deploying to network:', network.name, `(${network.chainId.toString()})`);
  console.log('Deployer:', deployer.address);

  const nftFactory = await ethers.getContractFactory('KhataFlowNFT');
  const nft = await nftFactory.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();

  const paymentsFactory = await ethers.getContractFactory('KhataFlowPayments');
  const payments = await paymentsFactory.deploy();
  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();

  const deployedAddresses = {
    network: network.name,
    chainId: network.chainId.toString(),
    nftContract: nftAddress,
    paymentsContract: paymentsAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, '../deployed-addresses.json'),
    JSON.stringify(deployedAddresses, null, 2)
  );

  const envContent = [
    `REACT_APP_NFT_CONTRACT_ADDRESS=${nftAddress}`,
    `REACT_APP_PAYMENTS_CONTRACT_ADDRESS=${paymentsAddress}`,
    'REACT_APP_FLOW_CHAIN_ID=545',
    `NFT_CONTRACT_ADDRESS=${nftAddress}`,
    `PAYMENTS_CONTRACT_ADDRESS=${paymentsAddress}`,
    'FLOW_EVM_RPC=https://testnet.evm.nodes.onflow.org'
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, '../deployed.env'), envContent);

  const artifactsBase = path.join(__dirname, '../artifacts/contracts');
  const nftArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsBase, 'KhataFlowNFT.sol/KhataFlowNFT.json'),
      'utf8'
    )
  );
  const paymentsArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsBase, 'KhataFlowPayments.sol/KhataFlowPayments.json'),
      'utf8'
    )
  );

  const frontendContractsDir = path.join(__dirname, '../../frontend/src/lib/contracts');
  fs.mkdirSync(frontendContractsDir, { recursive: true });
  fs.writeFileSync(
    path.join(frontendContractsDir, 'KhataFlowNFT.json'),
    JSON.stringify(nftArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendContractsDir, 'KhataFlowPayments.json'),
    JSON.stringify(paymentsArtifact.abi, null, 2)
  );

  const backendContractsDir = path.join(__dirname, '../../backend/src/contracts');
  fs.mkdirSync(backendContractsDir, { recursive: true });
  fs.writeFileSync(
    path.join(backendContractsDir, 'KhataFlowNFT.json'),
    JSON.stringify(nftArtifact.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(backendContractsDir, 'KhataFlowPayments.json'),
    JSON.stringify(paymentsArtifact.abi, null, 2)
  );

  console.log('KhataFlowNFT deployed:', nftAddress);
  console.log('KhataFlowPayments deployed:', paymentsAddress);
  console.log('ABIs copied to frontend and backend.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
