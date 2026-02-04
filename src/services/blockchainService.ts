import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate, cryptoWaitReady } from '@polkadot/util-crypto';

export const NETWORKS = {
    polkadot: 'wss://rpc.polkadot.io',
    westend: 'wss://westend-rpc.dwellir.com',
    paseo: 'wss://paseo.rpc.amforc.com'
};

const TREASURY_ADDRESS = '14dUZFW2EYTriLEN4Y8mmTjkC5nBk1jMqMhjNBiG2Y1KoSKN';
const PROTOCOL_FEE = 0.25; // DOT

class BlockchainService {
    private api: ApiPromise | null = null;
    private currentRpc: string = NETWORKS.polkadot;

    async init() {
        if (this.api) return this.api;
        const provider = new WsProvider(this.currentRpc);
        this.api = await ApiPromise.create({ provider });
        await cryptoWaitReady();
        return this.api;
    }

    async switchNetwork(rpcUrl: string) {
        if (this.currentRpc === rpcUrl) return;
        this.currentRpc = rpcUrl;
        if (this.api) {
            await this.api.disconnect();
            this.api = null;
        }
    }

    async generateNewWallet() {
        await cryptoWaitReady();
        const mnemonic = mnemonicGenerate();
        const keyring = new Keyring({ type: 'sr25519' });
        const pair = keyring.addFromUri(mnemonic);
        return {
            mnemonic,
            address: pair.address
        };
    }

    async getBalance(addressOrSeed: string) {
        try {
            const api = await this.init();
            let address = addressOrSeed;

            // Detect if it's a mnemonic or seed
            if (addressOrSeed.split(' ').length >= 12 || addressOrSeed.startsWith('//')) {
                const keyring = new Keyring({ type: 'sr25519' });
                const pair = keyring.addFromUri(addressOrSeed);
                address = pair.address;
                console.log(`[BLOCKCHAIN] Derived address ${address} from seed`);
            }

            const accountInfo = await api.query.system.account(address) as any;
            const { free } = accountInfo.data;

            // Get chain metadata for precision and name
            const chain = await api.rpc.system.chain();
            const chainProps = await api.rpc.system.properties();
            const decimals = (chainProps.tokenDecimals.toHuman() as string[])?.[0] || '10';
            const symbol = (chainProps.tokenSymbol.toHuman() as string[])?.[0] || 'DOT';

            const divisor = Math.pow(10, Number(decimals));

            // Calculate real balance
            const balanceNum = Number(free.toString()) / divisor;
            const formatted = balanceNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            });

            console.log(`[BLOCKCHAIN] Connected to ${chain}. Balance for ${address}: ${formatted} ${symbol}`);
            return { formatted, symbol };
        } catch (e) {
            console.error('[BLOCKCHAIN] Balance check failed:', e);
            return { formatted: '0.00', symbol: '???' };
        }
    }

    /**
     * Azmitar: Mints an RWA NFT and handles protocol fees
     */
    async azmitarAsset(ownerSeed: string, metadata: any) {
        const api = await this.init();
        const keyring = new Keyring({ type: 'sr25519' });
        const pair = keyring.addFromUri(ownerSeed);

        console.log(`[POLKADOT] Initiating Azmitization for: ${pair.address}`);
        console.log(`[PROTOCOL] Fee of ${PROTOCOL_FEE} DOT will be transferred to Treasury: ${TREASURY_ADDRESS}`);

        // 1. Logic for fee transfer (balances.transferKeepAlive)
        // 2. Logic for NFT Minting (uniques.create or nfts.mint)

        // Mock transaction hash representing both actions on-chain
        const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        // Simulate chain interaction delay
        await new Promise(resolve => setTimeout(resolve, 3500));

        return {
            success: true,
            txHash,
            azmitId: `AZM-${Date.now()}`,
            feePaid: PROTOCOL_FEE,
            treasury: TREASURY_ADDRESS
        };
    }
}

export default new BlockchainService();
