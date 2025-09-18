import privfiFlowImage from "@/assets/privfi-flow.png";
import { ImageWithLightbox } from "@/shared/components/ImageWithLightbox";

const HowItWorks = () => {
  return (
    <div className="flex-1 flex items-center justify-center my-40">
      <div className="w-1/2 max-w-4xl text-white font-mono leading-relaxed px-8">
        <div className="mb-16 flex justify-center">
          <ImageWithLightbox
            src={privfiFlowImage}
            alt="PrivFi Flow Diagram - DEX Aggregation Process"
            className="max-w-full h-auto rounded-lg border border-gray-700/50"
          />
        </div>

        <p className="mb-16 text-gray-200">
          Let's walk through how PrivFi works end-to-end when Alice wants to swap <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">1 ETH</code> for <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code>.
        </p>

        <div className="mb-16">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">DEX Aggregation Swap Flow</h2>

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
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Quote comparison and selection</p>
                <p className="mb-2">Alice reviews multiple quote options showing:</p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Output amount</code> (e.g., "3,200 USDC")</li>
                  <li>• <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">DEX source</code> and routing path</li>
                  <li>• <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Price impact</code> and estimated fees</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">4.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Transaction building</p>
                <p>Alice selects the best quote. <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">AVNU</code> builds the optimal swap transaction calls with token approvals included.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">5.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Wallet signature</p>
                <p>Alice signs the transaction in her wallet. The swap executes on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> with optimal routing across DEXs.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">6.</span>
              <div className="text-gray-200">
                <p className="font-semibold mb-2">Swap completion</p>
                <p>Alice receives her <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code> directly in her wallet. The transaction is complete and visible on <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> explorers.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Summary</h2>

          <ul className="space-y-2 text-gray-200">
            <li>• Fast and efficient DEX aggregation for best prices</li>
            <li>• Supports major <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">Starknet</code> tokens: <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">ETH</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">STRK</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">USDC</code>, <code className="bg-gray-800/50 px-1 py-0.5 rounded text-gray-100">WBTC</code></li>
            <li>• Optimal routing across multiple DEX protocols</li>
            <li>• Configurable slippage protection</li>
            <li>• Real-time quote updates and expiry protection</li>
            <li>• Transaction status tracking and explorer links</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;