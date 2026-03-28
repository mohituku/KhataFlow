import { useState } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '../store/useWalletStore';
import { CONTRACTS, FLOW_TESTNET, ZERO_ADDRESS } from '../lib/contracts';
import { fetchJson, getBusinessId } from '../lib/api';

export const useMintNFT = () => {
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const { signer } = useWalletStore();

  const mintNFT = async ({ businessId, clientName, amountInr, dueDateUnix, invoiceId }) => {
    if (!signer) {
      throw new Error('Wallet not connected. Please connect MetaMask first.');
    }

    if (!Array.isArray(CONTRACTS.NFT.abi) || CONTRACTS.NFT.abi.length === 0) {
      throw new Error('NFT ABI not found. Deploy contracts and copy the ABI first.');
    }

    if (!CONTRACTS.NFT.address || CONTRACTS.NFT.address === ZERO_ADDRESS) {
      throw new Error('NFT contract address not configured. Deploy contracts first.');
    }

    setIsMinting(true);
    setError(null);
    setTxHash(null);

    try {
      const contract = new ethers.Contract(CONTRACTS.NFT.address, CONTRACTS.NFT.abi, signer);
      const address = await signer.getAddress();
      const amountInPaise = BigInt(Math.round(Number(amountInr) * 100));
      const dueDateBigInt = BigInt(Math.floor(Number(dueDateUnix)));

      const tx = await contract.mintDebt(
        address,
        businessId || getBusinessId(),
        clientName,
        amountInPaise,
        dueDateBigInt,
        invoiceId || ''
      );

      setTxHash(tx.hash);

      const receipt = await tx.wait(1);
      const contractInterface = new ethers.Interface(CONTRACTS.NFT.abi);

      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contractInterface.parseLog(log);
          if (parsedLog?.name === 'Transfer') {
            tokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch (parseError) {
          // Ignore unrelated logs.
        }
      }

      if (invoiceId) {
        await fetchJson('/api/chain/record-mint', {
          method: 'POST',
          body: JSON.stringify({
            txHash: tx.hash,
            tokenId,
            invoiceId,
            dueDate: new Date(Number(dueDateUnix) * 1000).toISOString()
          })
        });
      }

      return {
        success: true,
        txHash: tx.hash,
        tokenId,
        explorerUrl: `${FLOW_TESTNET.blockExplorerUrls[0]}/tx/${tx.hash}`
      };
    } catch (mintError) {
      const message = mintError.reason || mintError.message || 'Mint failed';
      console.error('Mint error:', mintError);
      setError(message);
      throw new Error(message);
    } finally {
      setIsMinting(false);
    }
  };

  return { mintNFT, isMinting, txHash, error };
};
