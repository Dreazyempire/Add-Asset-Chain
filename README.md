# Asset Chain Wallet Installer — V2

This build uses Reown AppKit as the wallet fallback and EIP-6963 for installed browser wallets.

## Setup

1. Install Node.js 18+.
2. Extract the project.
3. Create `.env` from `.env.example`.
4. Keep the supplied Reown Project ID in `VITE_REOWN_PROJECT_ID`.
5. Run:

```bash
npm install
npm run dev
```

Then open the local Vite URL.

For production:

```bash
npm run build
npm run preview
```

Deploy the `dist` folder to a static host.

## Important production configuration

In Reown Cloud, add the final production website origin to the project's allowed origins/allowlist. Reown recommends origin allowlisting for Project IDs.

The app is intentionally minimal: users see only Mainnet/Testnet buttons. AppKit handles the wallet selection fallback.

## Wallet behavior

Installed injected wallets are requested through EIP-6963 / wallet_addEthereumChain.

When no injected provider is available, Reown AppKit opens its wallet selector, giving access to WalletConnect-compatible wallets and mobile flows.

The page never asks for seed phrases or private keys.
