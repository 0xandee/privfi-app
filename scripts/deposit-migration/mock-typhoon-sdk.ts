// Mock Typhoon SDK for testing purposes
// This allows testing the script logic without actual SDK dependencies

export class TyphoonSDK {
  private secrets: string[] = [];
  private nullifiers: string[] = [];
  private pools: string[] = [];

  init(secrets: unknown[], nullifiers: unknown[], pools: unknown[]): void {
    this.secrets = secrets as string[];
    this.nullifiers = nullifiers as string[];
    this.pools = pools as string[];
    console.log(`  🔧 SDK initialized with ${secrets.length} secrets, ${nullifiers.length} nullifiers, ${pools.length} pools`);
  }

  async get_withdraw_calldata(txHash: string, recipients: string[]): Promise<unknown> {
    console.log(`  📋 Generated calldata for tx: ${txHash.slice(0, 10)}... to ${recipients.length} recipient(s)`);
    return { calldata: 'mock_calldata' };
  }

  async withdraw(txHash: string, recipients: string[]): Promise<boolean> {
    console.log(`  🌪️  Executing withdrawal for tx: ${txHash.slice(0, 10)}... to ${recipients.join(', ')}`);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock success (could randomly fail for testing)
    const success = Math.random() > 0.1; // 90% success rate

    if (!success) {
      throw new Error('Mock withdrawal failed - simulated error');
    }

    return true;
  }
}