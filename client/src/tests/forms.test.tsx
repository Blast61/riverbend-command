// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DecisionForm } from '../components/DecisionForm';
import { PurchaseForm } from '../components/PurchaseForm';
import { decimalToCents } from '../format';
afterEach(cleanup);
describe('decision forms', () => {
  it.each(['REJECTED', 'CHANGES_REQUESTED'] as const)('requires a meaningful explanation for %s', async decision => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DecisionForm decision={decision} busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    const button = screen.getByRole('button', { name: decision === 'REJECTED' ? 'Reject request' : 'Request changes' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByRole('textbox', { name: /Explanation/ }), '   ');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByRole('textbox', { name: /Explanation/ }), 'Please clarify');
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledWith('Please clarify');
  });
  it('allows approval without a comment and preserves a server failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Stage is no longer active'));
    render(<DecisionForm decision="APPROVED" busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve request' }));
    expect(onSubmit).toHaveBeenCalledWith('');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Stage is no longer active');
  });
});
describe('purchase form', () => {
  it('converts dollars to cents and retains fields when the API rejects submission', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('No configured manager'));
    const user = userEvent.setup();
    render(<PurchaseForm busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Vendor' }), 'Demo Vendor');
    await user.type(screen.getByRole('textbox', { name: 'Amount (USD)' }), '1000.01');
    await user.type(screen.getByRole('textbox', { name: 'Business reason' }), 'Demo reason');
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ vendor: 'Demo Vendor', amountCents: 100001, reason: 'Demo reason' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No configured manager');
    expect(screen.getByRole('textbox', { name: 'Vendor' })).toHaveProperty('value', 'Demo Vendor');
  });
  it.each(['1.005', '-1', '1e3', '0', 'NaN'])('rejects ambiguous/invalid dollar input %s', value => expect(decimalToCents(value)).toBeNull());
  it.each([['999.99', 99999], ['1000.00', 100000], ['9999.99', 999999], ['10000.00', 1000000], ['0.01', 1]])('converts %s without rounding', (value, cents) => expect(decimalToCents(value as string)).toBe(cents));
});
