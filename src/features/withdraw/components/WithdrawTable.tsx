import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { formatTokenAmount, formatBalanceForDisplay } from '@/constants/tokens';
import type { GroupedDeposits } from '../types';

interface WithdrawTableProps {
  groupedDeposits: GroupedDeposits[];
  selectedDepositIds: string[];
  isLoading?: boolean;
  onWithdrawToken: (tokenAddress: string, deposits: GroupedDeposits) => void;
  onSelectDeposits: (depositIds: string[]) => void;
}

export const WithdrawTable = ({
  groupedDeposits,
  selectedDepositIds,
  isLoading = false,
  onWithdrawToken,
  onSelectDeposits,
}: WithdrawTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawable Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading deposits...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groupedDeposits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawable Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">No deposits available for withdrawal</div>
            <div className="text-sm text-muted-foreground">
              Deposits must be confirmed before they can be withdrawn
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSelectAll = (tokenAddress: string) => {
    const tokenGroup = groupedDeposits.find(g => g.tokenAddress === tokenAddress);
    if (!tokenGroup) return;

    const tokenDepositIds = tokenGroup.deposits
      .filter(d => d.canWithdraw)
      .map(d => d.id);

    // If all deposits for this token are already selected, deselect them
    const allSelected = tokenDepositIds.every(id => selectedDepositIds.includes(id));

    if (allSelected) {
      // Deselect all deposits for this token
      const newSelection = selectedDepositIds.filter(id => !tokenDepositIds.includes(id));
      onSelectDeposits(newSelection);
    } else {
      // Select all deposits for this token (replace any existing selection)
      onSelectDeposits(tokenDepositIds);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawable Deposits</CardTitle>
        <div className="text-sm text-muted-foreground">
          Select deposits to withdraw to your desired recipient address
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Deposits</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedDeposits.map((group) => {
              const withdrawableDeposits = group.deposits.filter(d => d.canWithdraw);
              const tokenDepositIds = withdrawableDeposits.map(d => d.id);
              const isSelected = tokenDepositIds.some(id => selectedDepositIds.includes(id));
              const allSelected = tokenDepositIds.every(id => selectedDepositIds.includes(id));

              // Format the total amount for display
              const formattedAmount = formatBalanceForDisplay(
                formatTokenAmount(group.totalAmount, group.token.decimals),
                group.token.symbol
              );

              return (
                <TableRow key={group.tokenAddress} className={isSelected ? "bg-muted/50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {group.token.logoURI && (
                        <img
                          src={group.token.logoURI}
                          alt={group.token.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium">{group.token.symbol}</div>
                        <div className="text-sm text-muted-foreground">{group.token.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      {formattedAmount} {group.token.symbol}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {withdrawableDeposits.length} deposit{withdrawableDeposits.length !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Ready to withdraw
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(group.tokenAddress)}
                      >
                        {allSelected ? 'Deselect' : 'Select'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onWithdrawToken(group.tokenAddress, group)}
                        disabled={withdrawableDeposits.length === 0}
                      >
                        Withdraw
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};