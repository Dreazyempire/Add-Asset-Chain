import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain, mainnet } from '@reown/appkit/networks'

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

const status = document.getElementById('status')
function announce(message, good = false) {
  status.textContent = message
  status.style.color = good ? '#63F3FF' : ''
}

let appKit = null
let pendingChain = null // network the user wants, waiting for wallet connection
let busy = false

function chainData(chain) {
  return chain === 'mainnet' ? assetMainnet : assetTestnet
}

// Send wallet_addEthereumChain to any EIP-1193 provider
async function requestAdd(provider, chain) {
  const data = chainData(chain)
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
}

function handleError(e) {
  if (e?.code === 4001) announce('Request cancelled in wallet.')
  else {
    console.error(e)
    announce(e?.message || 'Wallet could not add the network.')
  }
}

// Step 1: installed browser wallet (EIP-6963, then window.ethereum)
async function findInjected() {
  const found = []
  const onAnnounce = e => { if (e.detail?.provider) found.push(e.detail.provider) }
  window.addEventListener('eip6963:announceProvider', onAnnounce)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await new Promise(r => setTimeout(r, 250))
  window.removeEventListener('eip6963:announceProvider', onAnnounce)
  return found[0] || window.ethereum || null
}

// Step 2: after Reown connects a wallet, add the network through it
async function addViaConnectedWallet() {
  if (!pendingChain || !appKit) return
  const chain = pendingChain
  pendingChain = null
  try {
    const provider = appKit.getWalletProvider()
    if (!provider) throw new Error('Wallet connected, but no provider found.')
    announce('Approve the request in your wallet...')
    await appKit.close()
    await requestAdd(provider, chain)
  } catch (e) {
    handleError(e)
  }
}

try {
  if (!projectId) throw new Error("Missing VITE_REOWN_PROJECT_ID (set it in Vercel env vars and redeploy)")
  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    // Ethereum is included so the wallet list isn't filtered down to wallets
    // that already know Asset Chain's custom chain IDs (this hides Zerion etc.)
    networks: [assetMainnet, assetTestnet, mainnet],
    defaultNetwork: assetMainnet,
    // Pin Zerion near the top (verify ID at walletguide.walletconnect.network)
    featuredWalletIds: [
      'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18'
    ],
    // Fallback: always list Zerion, opening it by deep link on mobile
    customWallets: [
      {
        id: 'zerion-custom',
        name: 'Zerion',
        homepage: 'https://zerion.io',
        mobile_link: 'zerion://',
        webapp_link: 'https://app.zerion.io'
      }
    ],
    projectId,
    metadata: {
      name: 'Asset Chain',
      description: 'Add Asset Chain Mainnet or Testnet to your wallet',
      url: window.location.origin,
      icons: [`${window.location.origin}/asset-chain-logo.jpg`]
    },
    features: { analytics: false, email: false, socials: false },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#12D9F5',
      '--w3m-border-radius-master': '16px'
    }
  })
  appKit.subscribeAccount(account => {
    if (account?.isConnected && pendingChain) addViaConnectedWallet()
  })
} catch (e) {
  console.error('AppKit init failed:', e)
  announce(e.message)
}

async function addNetwork(chain) {
  if (busy) return
  busy = true
  try {
    announce('Checking for an installed wallet...')
    const injected = await findInjected()
    if (injected) {
      try {
        await requestAdd(injected, chain)
        return
      } catch (e) {
        if (e?.code === 4001) return announce('Request cancelled in wallet.')
        console.error(e) // fall through to the wallet selector
      }
    }

    if (!appKit) return announce('No wallet found and the wallet selector is unavailable.')

    // Already connected through Reown? Add straight away.
    pendingChain = chain
    if (appKit.getIsConnected?.()) return addViaConnectedWallet()

    announce('Choose your wallet...')
    await appKit.open()
  } catch (e) {
    handleError(e)
  } finally {
    busy = false
  }
}

document.getElementById('mainnet').addEventListener('click', () => addNetwork('mainnet'))
document.getElementById('testnet').addEventListener('click', () => addNetwork('testnet'))
