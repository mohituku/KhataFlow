import 'dotenv/config';
import { ethers } from 'ethers';
import nftAbi from '../contracts/KhataFlowNFT.json';

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contractAddress: string;
  private nftContract: ethers.Contract | null = null;

  constructor() {
    const rpcUrl = process.env.FLOW_EVM_RPC || 'https://testnet.evm.nodes.onflow.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractAddress = process.env.NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

    if (
      this.contractAddress !== '0x0000000000000000000000000000000000000000' &&
      Array.isArray(nftAbi) &&
      nftAbi.length > 0
    ) {
      this.nftContract = new ethers.Contract(this.contractAddress, nftAbi, this.provider);
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return false;
      }

      return receipt.status === 1;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  async getTransactionDetails(txHash: string) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);

      return {
        transaction: tx,
        receipt,
        status: receipt?.status === 1 ? 'SUCCESS' : 'FAILED'
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  async getDebtRecord(tokenId: string) {
    if (!this.nftContract) {
      return null;
    }

    try {
      const debtRecord = await this.nftContract.getDebtRecord(BigInt(tokenId));
      return {
        businessId: debtRecord.businessId,
        clientName: debtRecord.clientName,
        amountInPaise: debtRecord.amountInPaise?.toString?.() || String(debtRecord.amountInPaise),
        dueDateUnix: debtRecord.dueDateUnix?.toString?.() || String(debtRecord.dueDateUnix),
        invoiceRef: debtRecord.invoiceRef,
        settled: Boolean(debtRecord.settled),
        mintedAt: debtRecord.mintedAt?.toString?.() || String(debtRecord.mintedAt)
      };
    } catch (error) {
      console.error('Error reading debt record:', error);
      return null;
    }
  }

  getExplorerUrl(txHash: string): string {
    return `https://evm-testnet.flowscan.io/tx/${txHash}`;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }
}

export const blockchainService = new BlockchainService();
