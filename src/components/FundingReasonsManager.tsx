import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { invalidateFundingReasonsCache } from '@/hooks/useFundingReasons';
import { Plus, Pencil, Trash2, GripVertical, Save, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type FundingReason = Database['public']['Tables']['funding_reasons']['Row'];

export function FundingReasonsManager() {
    const [reasons, setReasons] = useState<FundingReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ value: '', label: '', display_order: 0 });
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newReason, setNewReason] = useState({ value: '', label: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        setLoading(true);
        try {
            // Get auth token
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    accessToken = parsed?.access_token || '';
                } catch { }
            }

            const response = await fetch(
                'https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons?order=display_order.asc',
                {
                    method: 'GET',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setReasons(data || []);
        } catch (error) {
            console.error('Error fetching funding reasons:', error);
            toast({
                title: 'Error',
                description: 'Failed to load funding reasons',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newReason.value.trim() || !newReason.label.trim()) {
            toast({
                title: 'Error',
                description: 'Both value and label are required',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';
            if (storedData) {
                const parsed = JSON.parse(storedData);
                accessToken = parsed?.access_token || '';
            }

            const maxOrder = Math.max(...reasons.map(r => r.display_order), 0);

            const response = await fetch(
                'https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons',
                {
                    method: 'POST',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify({
                        value: newReason.value.toLowerCase().replace(/\s+/g, '_'),
                        label: newReason.label,
                        display_order: maxOrder + 1,
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            toast({ title: 'Success', description: 'Funding reason added' });
            setShowAddDialog(false);
            setNewReason({ value: '', label: '' });
            invalidateFundingReasonsCache();
            await fetchReasons();
        } catch (error: any) {
            console.error('Error adding funding reason:', error);
            toast({
                title: 'Error',
                description: error.message?.includes('duplicate') ? 'A reason with this value already exists' : 'Failed to add funding reason',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        setSaving(true);
        try {
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';
            if (storedData) {
                const parsed = JSON.parse(storedData);
                accessToken = parsed?.access_token || '';
            }

            const response = await fetch(
                `https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons?id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        label: editForm.label,
                        display_order: editForm.display_order,
                    }),
                }
            );

            if (!response.ok) throw new Error('Failed to update');

            toast({ title: 'Success', description: 'Funding reason updated' });
            setEditingId(null);
            invalidateFundingReasonsCache();
            await fetchReasons();
        } catch (error) {
            console.error('Error updating funding reason:', error);
            toast({
                title: 'Error',
                description: 'Failed to update funding reason',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        try {
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';
            if (storedData) {
                const parsed = JSON.parse(storedData);
                accessToken = parsed?.access_token || '';
            }

            const response = await fetch(
                `https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons?id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ is_active: !currentActive }),
                }
            );

            if (!response.ok) throw new Error('Failed to update');

            invalidateFundingReasonsCache();
            await fetchReasons();
            toast({
                title: 'Success',
                description: `Funding reason ${!currentActive ? 'enabled' : 'disabled'}`
            });
        } catch (error) {
            console.error('Error toggling funding reason:', error);
            toast({
                title: 'Error',
                description: 'Failed to update funding reason',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const storageKey = 'sb-ximkveundgebbvbgacfu-auth-token';
            const storedData = localStorage.getItem(storageKey);
            let accessToken = '';
            if (storedData) {
                const parsed = JSON.parse(storedData);
                accessToken = parsed?.access_token || '';
            }

            const response = await fetch(
                `https://ximkveundgebbvbgacfu.supabase.co/rest/v1/funding_reasons?id=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbWt2ZXVuZGdlYmJ2YmdhY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA2MzQsImV4cCI6MjA4NDE1NjYzNH0.7UGEMBH1SCibG3XavZ1G3cdxJhky0_1aw9Hh1pU3JdQ',
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to delete');

            toast({ title: 'Success', description: 'Funding reason deleted' });
            setDeleteConfirm(null);
            invalidateFundingReasonsCache();
            await fetchReasons();
        } catch (error) {
            console.error('Error deleting funding reason:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete funding reason',
                variant: 'destructive',
            });
        }
    };

    const startEdit = (reason: FundingReason) => {
        setEditingId(reason.id);
        setEditForm({
            value: reason.value,
            label: reason.label,
            display_order: reason.display_order,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Funding Reasons</CardTitle>
                <Button onClick={() => setShowAddDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reason
                </Button>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Manage the reasons users can select when seeking funds. Changes will appear immediately in the wizard.
                </p>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Order</TableHead>
                            <TableHead>Value (ID)</TableHead>
                            <TableHead>Display Label</TableHead>
                            <TableHead className="w-20">Active</TableHead>
                            <TableHead className="text-right w-32">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reasons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No funding reasons configured
                                </TableCell>
                            </TableRow>
                        ) : (
                            reasons.map((reason) => (
                                <TableRow key={reason.id}>
                                    <TableCell className="font-mono text-sm">
                                        {editingId === reason.id ? (
                                            <Input
                                                type="number"
                                                value={editForm.display_order}
                                                onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                                                className="w-16 h-8"
                                            />
                                        ) : (
                                            reason.display_order
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                        {reason.value}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === reason.id ? (
                                            <Input
                                                value={editForm.label}
                                                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                                className="h-8"
                                            />
                                        ) : (
                                            reason.label
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={reason.is_active}
                                            onCheckedChange={() => handleToggleActive(reason.id, reason.is_active)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === reason.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleUpdate(reason.id)}
                                                    disabled={saving}
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => startEdit(reason)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteConfirm(reason.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Add Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Funding Reason</DialogTitle>
                        <DialogDescription>
                            Create a new reason that users can select when seeking funds.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="label">Display Label</Label>
                            <Input
                                id="label"
                                placeholder="e.g., Home Improvement"
                                value={newReason.label}
                                onChange={(e) => setNewReason({
                                    ...newReason,
                                    label: e.target.value,
                                    value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="value">Value (auto-generated)</Label>
                            <Input
                                id="value"
                                value={newReason.value}
                                onChange={(e) => setNewReason({ ...newReason, value: e.target.value })}
                                className="font-mono text-sm"
                                placeholder="home_improvement"
                            />
                            <p className="text-xs text-muted-foreground">
                                This is the internal ID stored in the database
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={saving}>
                            {saving ? 'Adding...' : 'Add Reason'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Funding Reason</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this funding reason? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
