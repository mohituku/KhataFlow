import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('KhataFlowNFT', function () {
  it('mints a debt record and indexes it by business', async function () {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('KhataFlowNFT');
    const nft = await factory.deploy();
    await nft.waitForDeployment();

    const dueDate = BigInt(Math.floor(Date.now() / 1000) + 86400);
    await nft.mintDebt(owner.address, 'demo-business-001', 'Ramesh', 20000, dueDate, 'invoice-1');

    expect(await nft.totalSupply()).to.equal(1n);

    const record = await nft.getDebtRecord(1n);
    expect(record.clientName).to.equal('Ramesh');
    expect(record.amountInPaise).to.equal(20000n);

    const businessTokens = await nft.getBusinessTokens('demo-business-001');
    expect(businessTokens.map((tokenId: bigint) => tokenId.toString())).to.deep.equal(['1']);
  });

  it('rejects minting with a past due date', async function () {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('KhataFlowNFT');
    const nft = await factory.deploy();
    await nft.waitForDeployment();

    const dueDate = BigInt(Math.floor(Date.now() / 1000) - 60);

    await expect(
      nft.mintDebt(owner.address, 'demo-business-001', 'Ramesh', 20000, dueDate, 'invoice-1')
    ).to.be.revertedWith('Due date must be in the future');
  });

  it('allows the owner to settle a debt', async function () {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('KhataFlowNFT');
    const nft = await factory.deploy();
    await nft.waitForDeployment();

    const dueDate = BigInt(Math.floor(Date.now() / 1000) + 86400);
    await nft.mintDebt(owner.address, 'demo-business-001', 'Ramesh', 20000, dueDate, 'invoice-1');
    await nft.settleDebt(1n);

    const record = await nft.getDebtRecord(1n);
    expect(record.settled).to.equal(true);
  });
});
