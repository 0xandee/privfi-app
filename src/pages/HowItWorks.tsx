const HowItWorks = () => {
  return (
    <div className="flex-1 flex items-center justify-center my-40">
      <div className="w-1/2 max-w-4xl text-white font-mono leading-relaxed px-8">
        <p className="mb-16 text-gray-200">
          Let's walk through how PrivFi works end-to-end when Alice wants to privately swap <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">1 ETH</code> for <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code>.
        </p>

        <div className="mb-16">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Regular Swap Flow</h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">1.</span>
              <p className="text-gray-200">
                Alice opens PrivFi, connects her <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> wallet (Argent or Braavos), and selects <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH → USDC</code> swap.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">2.</span>
              <p className="text-gray-200">
                The app queries <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU DEX aggregator</code> which scans multiple DEX sources (<code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">JediSwap</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">mySwap</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">10KSwap</code>) and returns the best price quotes with optimal routing.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">3.</span>
              <p className="text-gray-200">
                Alice selects the best quote. <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU</code> builds the swap transaction calldata with approve and swap calls.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">4.</span>
              <p className="text-gray-200">Alice signs the transaction in her wallet.</p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">5.</span>
              <p className="text-gray-200">
                The swap executes on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> through <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU</code>'s aggregated routing, completing in ~10-15 seconds.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Private Swap Flow (Enhanced with Typhoon Privacy)</h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">1.</span>
              <p className="text-gray-200">
                Alice opens PrivFi, connects her <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> wallet, and selects <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH → USDC</code> swap with <strong>Privacy Mode enabled</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">2.</span>
              <p className="text-gray-200">
                The app queries <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU DEX aggregator</code> for optimal swap routes, just like regular swaps.
              </p>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">3.</span>
              <div className="text-gray-200">
                <p className="mb-2">Alice selects the best quote. The system now prepares a <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">multicall transaction</code>:</p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU</code> builds the swap calls (<code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH → USDC</code>)</li>
                  <li>• <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Typhoon SDK</code> generates privacy deposit calls using <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">zk-SNARK</code> technology</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">4.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Alice's <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">multicall transaction</code> on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code></p>
                <p>The transaction combines: swap execution + privacy pool deposit in a single atomic operation.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">5.</span>
              <div className="text-gray-200">
                <p className="mb-2">Alice signs the <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">multicall transaction</code>. Upon execution:</p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• Her <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH</code> is swapped to <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> via <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU</code></li>
                  <li>• The <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> is immediately deposited into <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Typhoon</code>'s privacy pools</li>
                  <li>• The system generates and stores <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">commitment/nullifier data</code> locally using zero-knowledge proofs</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">6.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Privacy layer activated</p>
                <p>The <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Typhoon protocol</code> creates cryptographic commitments that hide the link between Alice's deposit and any future withdrawal.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">7.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Private withdrawal anytime</p>
                <p>Later, Alice (or anyone with her nullifier data) can withdraw the <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> to any address without revealing the connection to the original swap transaction. The withdrawal uses zero-knowledge proofs to validate ownership without exposing transaction history.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Summary</h2>

          <ul className="space-y-2 text-gray-200">
            <li>• Process takes ~30-60 seconds (including privacy proof generation)</li>
            <li>• Funds never leave user control during the privacy process</li>
            <li>• Zero-knowledge technology breaks transaction linkability</li>
            <li>• Any <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> address can receive the private withdrawal</li>
            <li>• Supports major tokens: <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">STRK</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">WBTC</code> with minimum amounts for privacy mixing</li>
            <li>• Fallback protection: If privacy layer fails, transaction proceeds as regular swap</li>
            <li>• Local storage: Privacy keys stored securely in user's browser (exportable for backup)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;