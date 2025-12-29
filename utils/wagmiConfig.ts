import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';
import { codenутDevnet } from './evmConfig';

// Validate WalletConnect Project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// "God Tier" Validation: Crash immediately if config is missing
if (!projectId || projectId === 'YOUR_PROJECT_ID') {
  const errorStyle = "background: #D4AF37; color: #000; font-size: 20px; font-weight: bold; padding: 10px;";
  console.error("%c FATAL ERROR: VITE_WALLETCONNECT_PROJECT_ID is missing! ", errorStyle);
  throw new Error("Application configuration missing. Check .env file.");
}

// Use custom devnet chain
export const wagmiConfig = getDefaultConfig({
  appName: 'AUREUS - Blockchain Resume',
  projectId,
  chains: [codenутDevnet, sepolia, mainnet],
  ssr: false,
});
