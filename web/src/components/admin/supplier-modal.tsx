'use client';
import { useState } from 'react';
import type { SupplierDTO } from '@unibody/shared';
import { Button, Field, Input, Modal, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { FormGrid } from './ui';
import { adminApi, errMsg, fieldErrors } from '@/lib/admin/api';

export function SupplierModal({ item, onClose, onSaved }: { item?: SupplierDTO; onClose: () => void; onSaved: (s: SupplierDTO) => void }) {
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [city, setCity] = useState(item?.city ?? '');
  const [phone, setPhone] = useState(item?.phone ?? '');
  const [gstin, setGstin] = useState(item?.gstin ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErrors({ name: 'Enter the supplier name' });
    if (gstin.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase())) return setErrors({ gstin: 'GSTIN should be 15 characters, e.g. 29ABCDE1234F1Z5' });
    setBusy(true);
    const b = { name: name.trim(), city: city.trim() || null, phone: phone.trim() || null, gstin: gstin.trim().toUpperCase() || null, notes: notes.trim() || null };
    try {
      const s = item ? await adminApi.admin.updateSupplier(item.id, b) : await adminApi.admin.createSupplier(b);
      toast(item ? 'Supplier saved' : 'Supplier added');
      onSaved(s);
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Edit ${item.name}` : 'New supplier'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="supplier" loading={busy}>
            {item ? 'Save' : 'Add supplier'}
          </Button>
        </>
      }
    >
      <form id="supplier" onSubmit={submit} className="space-y-4">
        <Field label="Name" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="SP Road Electronics" autoFocus invalid={!!errors.name} />
        </Field>
        <FormGrid>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98450 00000" inputMode="tel" />
          </Field>
        </FormGrid>
        <Field label="GSTIN" error={errors.gstin} hint="Needed to claim input tax credit">
          <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" className="font-mono" maxLength={15} invalid={!!errors.gstin} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" placeholder="Payment terms, what they’re good for…" />
        </Field>
      </form>
    </Modal>
  );
}
