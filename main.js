import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

const assetMainnet = defineChain({
  id: 42420,
  caipNetworkId: 'eip155:42420',
  chainNamespace: 'eip155',
  name: 'Asset Chain Mainnet',
  nativeCurrency: { name: 'RWA', symbol: 'RWA', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet-rpc.assetchain.org'] } },
  blockExplorers: { default: { name: 'Asset Chain Explorer', url: 'https://scan.assetchain.org' } }
})

const assetTestnet = defineChain({
  id: 42421,
  caipNetworkId: 'eip155:42421',
  chainNamespace: 'eip155',
  name: 'Asset Chain Testnet',
  nativeCurrency: { name: 'RWA', symbol: 'RWA', decimals: 18 },
  rpcUrls: { default: { http: ['https://enugu-rpc.assetchain.org'] } },
  blockExplorers: { default: { name: 'Asset Chain Testnet Explorer', url: 'https://scan-testnet.assetchain.org' } }
})

const metadata = {
  name: 'Asset Chain',
  description: 'Add Asset Chain Mainnet or Testnet to your wallet',
  url: window.location.origin,
  icons: [`${window.location.origin}/asset-chain-logo.jpg`]
}

if (!projectId) throw new Error('Missing VITE_REOWN_PROJECT_ID')

const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [assetMainnet, assetTestnet],
  projectId,
  metadata,
  features: {
    analytics: false
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#12D9F5',
    '--w3m-border-radius-master': '16px'
  }
})

const status = document.getElementById('status')

function announce(message, good = false) {
  status.textContent = message
  status.style.color = good ? '#63F3FF' : ''
}

async function directAdd(chain) {
  const providers = new Map()
  window.addEventListener('eip6963:announceProvider', e => {
    if (e.detail?.provider) providers.set(e.detail.info?.uuid || e.detail.info?.name, e.detail.provider)
  }, { once: false })

  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await new Promise(r => setTimeout(r, 250))

  const fallback = window.ethereum
  const provider = providers.values().next().value || fallback
  if (!provider) return false

  const data = chain === 'mainnet' ? assetMainnet : assetTestnet
  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${data.id.toString(16)}`,
        chainName: data.name,
        nativeCurrency: data.nativeCurrency,
        rpcUrls: data.rpcUrls.default.http,
        blockExplorerUrls: [data.blockExplorers.default.url]
      }]
    })
    announce(`${data.name} added successfully.`, true)
    return true
  } catch (e) {
    if (e?.code === 4001) announce('Request cancelled in wallet.')
    return false
  }
}

async function addNetwork(chain) {
  announce('Checking for an installed wallet...')
  const added = await directAdd(chain)
  if (added) return

  // AppKit provides the multi-wallet / WalletConnect fallback.
  announce('Choose your wallet...')
  try {
    await appKit.open()
  } catch (e) {
    console.error(e)
    announce('Could not open the wallet selector.')
  }
}

document.getElementById('mainnet').onclick = () => addNetwork('mainnet')
document.getElementById('testnet').onclick = () => addNetwork('testnet')
