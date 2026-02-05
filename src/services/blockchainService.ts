
/**
 * Generic Blockchain Service (Agnostic Structure)
 * This service provides the structure for blockchain interactions 
 * without being tied to a specific protocol like Polkadot.
 */

interface ParachainConfig {
    name: string;
    symbol: string;
    rpc: string;
    explorer: string;
    api?: string;
}

interface NetworkConfig {
    rpc: string;
    symbol: string;
    name: string;
    explorer: string;
    api?: string | null;
    parachains?: ParachainConfig[];
}

export const NETWORKS: Record<string, NetworkConfig> = {
    polkadot: {
        rpc: 'wss://rpc.polkadot.io',
        symbol: 'DOT',
        name: 'Polkadot Network',
        explorer: 'polkadot.subscan.io',
        api: 'polkadot.api.subscan.io',
        parachains: [
            // System Parachains
            { name: 'AssetHub', symbol: 'DOT', rpc: 'wss://polkadot-asset-hub-rpc.polkadot.io', explorer: 'assethub-polkadot.subscan.io', api: 'assethub-polkadot.api.subscan.io' },
            { name: 'BridgeHub', symbol: 'DOT', rpc: 'wss://polkadot-bridge-hub-rpc.polkadot.io', explorer: 'bridgehub-polkadot.subscan.io', api: 'bridgehub-polkadot.api.subscan.io' },
            { name: 'Coretime', symbol: 'DOT', rpc: 'wss://polkadot-coretime-rpc.polkadot.io', explorer: 'coretime-polkadot.subscan.io', api: 'coretime-polkadot.api.subscan.io' },
            { name: 'Collectives', symbol: 'DOT', rpc: 'wss://polkadot-collectives-rpc.polkadot.io', explorer: 'collectives-polkadot.subscan.io', api: 'collectives-polkadot.api.subscan.io' },
            { name: 'People', symbol: 'DOT', rpc: 'wss://polkadot-people-rpc.polkadot.io', explorer: 'people-polkadot.subscan.io', api: 'people-polkadot.api.subscan.io' },
            // Popular Parachains
            { name: 'Moonbeam', symbol: 'GLMR', rpc: 'wss://wss.api.moonbeam.network', explorer: 'moonbeam.subscan.io', api: 'moonbeam.api.subscan.io' },
            { name: 'Astar', symbol: 'ASTR', rpc: 'wss://rpc.astar.network', explorer: 'astar.subscan.io', api: 'astar.api.subscan.io' },
            { name: 'Acala', symbol: 'ACA', rpc: 'wss://acala-rpc-0.aca-api.network', explorer: 'acala.subscan.io', api: 'acala.api.subscan.io' },
            { name: 'Bifrost', symbol: 'BNC', rpc: 'wss://bifrost-polkadot.dwellir.com', explorer: 'bifrost.subscan.io', api: 'bifrost.api.subscan.io' },
            { name: 'Centrifuge', symbol: 'CFG', rpc: 'wss://fullnode.parachain.centrifuge.io', explorer: 'centrifuge.subscan.io', api: 'centrifuge.api.subscan.io' },
            { name: 'Crust', symbol: 'CRU', rpc: 'wss://crust-parachain.api.onfinality.io/public-ws', explorer: 'crust.subscan.io', api: 'crust.api.subscan.io' },
            { name: 'Darwinia', symbol: 'RING', rpc: 'wss://rpc.darwinia.network', explorer: 'darwinia.subscan.io', api: 'darwinia.api.subscan.io' },
            { name: 'Hydration', symbol: 'HDX', rpc: 'wss://rpc.hydradx.cloud', explorer: 'hydration.subscan.io', api: 'hydration.api.subscan.io' },
            { name: 'Heima', symbol: 'HEI', rpc: 'wss://rpc.heima-parachain.heima.network', explorer: 'heima.subscan.io', api: 'heima.api.subscan.io' },
            { name: 'Manta Atlantic', symbol: 'MANTA', rpc: 'wss://manta-rpc.dwellir.com', explorer: 'manta.subscan.io', api: 'manta.api.subscan.io' },
            { name: 'Mythos', symbol: 'MYTH', rpc: 'wss://polkadot-mythos-rpc.polkadot.io', explorer: 'mythos.subscan.io', api: 'mythos.api.subscan.io' },
            { name: 'NeuroWeb', symbol: 'NEURO', rpc: 'wss://rpc.neuroweb.ai', explorer: 'neuroweb.subscan.io', api: 'neuroweb.api.subscan.io' },
            { name: 'peaq', symbol: 'PEAQ', rpc: 'wss://wss.peaq.network', explorer: 'peaq.subscan.io', api: 'peaq.api.subscan.io' },
            { name: 'Pendulum', symbol: 'PEN', rpc: 'wss://rpc-pendulum.pendulumchain.org', explorer: 'pendulum.subscan.io', api: 'pendulum.api.subscan.io' },
            { name: 'Phala', symbol: 'PHA', rpc: 'wss://rpc.phala.network', explorer: 'phala.subscan.io', api: 'phala.api.subscan.io' },
            { name: 'Robonomics', symbol: 'XRT', rpc: 'wss://robonomics.dwellir.com', explorer: 'robonomics.subscan.io', api: 'robonomics.api.subscan.io' },
            { name: 'Unique', symbol: 'UNQ', rpc: 'wss://ws.unique.network', explorer: 'unique.subscan.io', api: 'unique.api.subscan.io' }
        ]
    },
    westend: {
        rpc: 'wss://westend-rpc.polkadot.io',
        symbol: 'WND',
        name: 'Westend Network',
        explorer: 'westend.subscan.io',
        api: 'westend.api.subscan.io',
        parachains: [
            { name: 'AssetHub Westend', symbol: 'WND', rpc: 'wss://westend-asset-hub-rpc.polkadot.io', explorer: 'assethub-westend.subscan.io', api: 'assethub-westend.api.subscan.io' }
        ]
    },
    mainnet: {
        rpc: 'https://rpc.generic.io',
        symbol: 'AZM',
        name: 'Azmita Mainnet',
        explorer: 'explorer.azmita.io',
        api: null
    },
    dev: {
        rpc: 'https://dev.generic.io',
        symbol: 'DEV',
        name: 'Network Dev',
        explorer: 'localhost:3000',
        api: null
    }
};

const SUBSCAN_CONFIG = {
    apiKey: '0888112ec23541e1b67d43792d89e028'
};

class BlockchainService {
    private currentRpc: string = NETWORKS.mainnet.rpc;

    async init() {
        console.log(`[BLOCKCHAIN] Initializing connection to ${this.currentRpc}`);
        return true;
    }

    async switchNetwork(rpcUrl: string) {
        console.log(`[BLOCKCHAIN] Switching network to: ${rpcUrl}`);
        this.currentRpc = rpcUrl;
    }

    getNetworkConfig() {
        const allNetworks = Object.values(NETWORKS);

        // 1. Search top-level networks
        const primary = allNetworks.find(n => n.rpc === this.currentRpc);
        if (primary) return primary;

        // 2. Search within parachains of ANY network
        for (const network of allNetworks) {
            if (network.parachains) {
                const para = network.parachains.find(p => p.rpc === this.currentRpc);
                if (para) return para;
            }
        }

        return NETWORKS.mainnet;
    }

    async generateNewWallet() {
        const entropy = Array.from({ length: 12 }, () => Math.random().toString(36).substring(7)).join(' ');
        const mockAddress = 'AZM' + Math.random().toString(36).substring(2, 15).toUpperCase();

        return {
            mnemonic: entropy,
            address: mockAddress
        };
    }

    async getBalance(address: string) {
        try {
            console.log(`[BLOCKCHAIN] Checking balance for: ${address.substring(0, 10)}...`);
            const config = this.getNetworkConfig();

            if (config.api) {
                try {
                    const response = await fetch(`https://${config.api}/api/v2/scan/search`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': SUBSCAN_CONFIG.apiKey
                        },
                        body: JSON.stringify({ key: address })
                    });
                    const data = await response.json();
                    if (data.code === 0 && data.data && data.data.account) {
                        return {
                            formatted: data.data.account.balance,
                            symbol: config.symbol
                        };
                    }
                } catch (apiErr) {
                    console.warn('[SUBSCAN] Balance API failed:', apiErr);
                }
            }

            // Fallback mock
            const mockBalance = (Math.random() * 10).toFixed(2);
            return {
                formatted: mockBalance,
                symbol: config.symbol
            };
        } catch (e) {
            console.error('[BLOCKCHAIN] Balance check failed:', e);
            return { formatted: '0.00', symbol: '???' };
        }
    }

    /**
     * Azmitar: Mints an RWA NFT (Generic Simulation)
     */
    async azmitarAsset(ownerAddress: string, metadata: any) {
        console.log(`[BLOCKCHAIN] INITIATING ACTIVATION for UID: ${metadata.uid}`);

        const chainOfCustody = [
            {
                date: Date.now() - (60 * 60 * 24 * 7 * 1000),
                event: 'FACTORY_PROVISIONING',
                owner: 'Manufacturer',
                status: 'VERIFIED'
            },
            {
                date: Date.now(),
                event: 'VINCULATION',
                owner: ownerAddress,
                status: 'LOCKED'
            }
        ];

        const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        // Simulate interaction delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            success: true,
            txHash,
            azmitId: `AZM-${metadata.uid.slice(-6).toUpperCase()}`,
            chainOfCustody
        };
    }

    async sendTransfer(senderMnemonic: string, toAddress: string, amount: string): Promise<{ success: boolean; txHash: string }> {
        try {
            console.log(`[BLOCKCHAIN] Transferring ${amount} to ${toAddress}`);
            const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

            await new Promise(resolve => setTimeout(resolve, 1500));

            return {
                success: true,
                txHash: txHash
            };
        } catch (error: any) {
            console.error('Error sending transfer:', error);
            return {
                success: false,
                txHash: '',
            };
        }
    }

    async validateMnemonic(mnemonic: string) {
        // Basic validation: check if it has 12 words
        return mnemonic.trim().split(/\s+/).length === 12;
    }

    /**
     * Fetch transactions from Subscan API or fallback to mock
     */
    async getTransactions(address: string) {
        try {
            console.log(`[EXPLORER] Fetching history for ${address}`);
            const config = this.getNetworkConfig();

            if (config.api) {
                console.log(`[SUBSCAN] Querying ${config.api} for address ${address}`);
                try {
                    const response = await fetch(`https://${config.api}/api/v2/scan/transfers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': SUBSCAN_CONFIG.apiKey
                        },
                        body: JSON.stringify({ address, row: 10, page: 0 })
                    });

                    const data = await response.json();
                    if (data.code === 0 && data.data && data.data.transfers) {
                        return data.data.transfers.map((tx: any) => ({
                            hash: tx.hash,
                            type: tx.from === address ? 'sent' : 'received',
                            amount: tx.amount,
                            timestamp: tx.block_timestamp * 1000,
                            from: tx.from,
                            to: tx.to,
                            success: tx.success !== false,
                            isXcm: false
                        }));
                    }
                } catch (apiErr) {
                    console.warn('[SUBSCAN] API Call failed, falling back to mock:', apiErr);
                }
            }

            // Fallback for non-subscan networks or errors
            const mockTxs = Array.from({ length: 5 }, (_, i) => ({
                hash: '0x' + Math.random().toString(16).slice(2),
                type: Math.random() > 0.5 ? 'sent' : 'received',
                amount: (Math.random() * 10).toFixed(2),
                timestamp: Date.now() - (i * 3600000),
                from: i % 2 === 0 ? address : '0xOtherAddress',
                to: i % 2 === 0 ? '0xTargetAddress' : address,
                success: true,
                isXcm: false
            }));

            return mockTxs;
        } catch (error) {
            console.error('[EXPLORER] Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Helper to fetch parachain list dynamically as per Subscan documentation
     * /api/scan/parachain/list
     */
    async getDynamicParachains() {
        try {
            const response = await fetch(`https://polkadot.api.subscan.io/api/scan/parachain/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': SUBSCAN_CONFIG.apiKey
                },
                body: JSON.stringify({})
            });
            return await response.json();
        } catch (e) {
            console.error('[SUBSCAN] Dynamic parachain fetch failed', e);
            return null;
        }
    }
}

export default new BlockchainService();
