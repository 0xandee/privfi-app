import React from 'react';
import { Shield, Send, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { DepositForm } from './DepositForm';
import { WithdrawalForm } from './WithdrawalForm';
import { usePrivacyStore } from '../store';
import { useWalletConnection } from '@/features/wallet';

export const PrivacyDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = usePrivacyStore();
  const { isConnected } = useWalletConnection();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Protocol</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Send and receive tokens privately using MIST.cash zero-knowledge protocol on Starknet.
        </p>

        <div className="flex items-center justify-center gap-4 text-sm">
          <Badge variant="secondary">Starknet</Badge>
          <Badge variant="secondary">Zero Knowledge</Badge>
          <Badge variant="secondary">Private</Badge>
          <Badge variant="secondary">Secure</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'deposit' | 'withdrawal')}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="deposit" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdrawal" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Withdraw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-6">
          <DepositForm />
        </TabsContent>

        <TabsContent value="withdrawal" className="space-y-6">
          <WithdrawalForm />
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How Privacy Protocol Works</CardTitle>
          <CardDescription>
            Understanding the MIST.cash privacy mechanism
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-green-600" />
                Private Deposit
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p>Generate a unique claiming key and specify recipient address</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p>Create transaction hash using cryptographic secrets</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p>Store hash in merkle tree and deposit tokens to contract</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p>Share claiming key with recipient through secure channels</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-600" />
                Private Withdrawal
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p>Enter claiming key and recipient address</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p>Generate transaction secret and search merkle tree</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p>Verify transaction exists and retrieve token details</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p>Execute withdrawal with merkle proof verification</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};