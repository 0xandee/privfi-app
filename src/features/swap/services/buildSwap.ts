import { BuildSwapRequest, BuildSwapResponse } from '../types/swap';
import { API_CONFIG } from '@/core/config';
import { withRetry } from '@/core/api';

export class BuildSwapService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.avnu.baseUrl;
  }

  async buildSwap(request: BuildSwapRequest): Promise<BuildSwapResponse> {
    if (!request.quoteId) {
      throw new Error('Quote ID is required');
    }
    
    if (!request.takerAddress) {
      throw new Error('Taker address is required');
    }

    if (request.slippage < 0 || request.slippage > 1) {
      throw new Error('Slippage must be between 0 and 1 (0-100%)');
    }

    const requestBody = {
      quoteId: request.quoteId,
      takerAddress: request.takerAddress,
      slippage: request.slippage,
      includeApprove: request.includeApprove ?? true,
    };

    return withRetry(
      async () => {
        const response = await fetch(`${this.baseUrl}/swap/v2/build`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Build swap failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.calls || !Array.isArray(data.calls)) {
          throw new Error('Invalid build response: missing calls array');
        }

        return data;
      },
      { maxRetries: 2, delayMs: 1000, backoffMultiplier: 1.5 }
    );
  }
}