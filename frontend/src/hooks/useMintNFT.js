import { useState } from 'react';
import { useWalletStore } from '../store/useWalletStore';

export const useMintNFT = () => {
  const [isMinting, setIsMinting] = useState(false);
  const { signer } = useWalletStore();

  const mintNFT = async (invoiceData) => {
    setIsMinting(true);
    
    try {
      console.log('Minting NFT for:', invoiceData);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 40);
      
      setIsMinting(false);
      return {
        success: true,
        txHash: mockTxHash,
        tokenId: Math.floor(Math.random() * 1000)
      };
    } catch (error) {
      setIsMinting(false);
      throw error;
    }
  };

  return { mintNFT, isMinting };
};