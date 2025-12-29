import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  Wallet, 
  LogOut, 
  Network, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { codenутDevnet, chainId } from '@/utils/evmConfig';
import { trackWalletConnected } from '@/lib/posthog';
import { useEffect } from 'react';

export function WalletInfo() {
  const { address, isConnected, chain, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { chains, switchChain, isPending: isSwitching } = useSwitchChain();
  
  // Track wallet connection
  useEffect(() => {
    if (isConnected && address && connector) {
      trackWalletConnected(connector.name, address);
    }
  }, [isConnected, address, connector]);
  
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4">
          <Wallet className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2 font-neopixel">Connect Your Wallet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to interact with AUREUS smart contracts
            </p>
          </div>
          <ConnectButton />
        </div>
      </Card>
    );
  }

  const isCorrectNetwork = chain?.id === chainId;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            <span className="font-semibold">Wallet Connected</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect()}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Disconnect wallet"
          >
            <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
            Disconnect
          </Button>
        </div>

        {/* Address */}
        <div>
          <label className="text-sm text-muted-foreground">Address</label>
          <div className="font-mono text-sm mt-1 p-2 bg-muted rounded-md break-all">
            {address}
          </div>
        </div>

        {/* Balance */}
        <div>
          <label className="text-sm text-muted-foreground">Balance</label>
          <div className="text-2xl font-bold mt-1" aria-live="polite" aria-atomic="true">
            {isLoadingBalance ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading balance" />
            ) : (
              <>
                {balance?.value ? (Number(balance.value) / 1e18).toFixed(4) : '0.0000'}{' '}
                {balance?.symbol || 'ETH'}
              </>
            )}
          </div>
        </div>

        {/* Network Info */}
        <div>
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <Network className="h-4 w-4" aria-hidden="true" />
            Network
          </label>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isCorrectNetwork ? 'default' : 'destructive'}>
              {chain?.name || 'Unknown Network'}
            </Badge>
            {chain?.id && (
              <span className="text-xs text-muted-foreground">
                Chain ID: {chain.id}
              </span>
            )}
          </div>
        </div>

        {/* Network Switcher */}
        {!isCorrectNetwork && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="flex items-center justify-between">
              <span>Wrong network. Please switch to {codenутDevnet.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchChain({ chainId: chainId })}
                disabled={isSwitching}
                className="ml-2"
              >
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  'Switch Network'
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Contract Addresses Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Connected to AUREUS smart contracts on {chain?.name}
          </p>
        </div>
      </div>
    </Card>
  );
}
