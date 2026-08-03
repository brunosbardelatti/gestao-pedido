'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CircleCheck,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do cliente.')
    .max(150, 'O nome deve ter no máximo 150 caracteres.'),
  cpf: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{11}$/.test(value), {
      message: 'Informe os 11 dígitos do CPF.',
    }),
  phone: z
    .string()
    .trim()
    .max(20, 'O telefone deve ter no máximo 20 caracteres.'),
  addressLine: z
    .string()
    .trim()
    .max(255, 'O endereço deve ter no máximo 255 caracteres.'),
  city: z
    .string()
    .trim()
    .max(100, 'A cidade deve ter no máximo 100 caracteres.'),
  state: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[A-Za-z]{2}$/.test(value), {
      message: 'Informe uma UF com 2 letras.',
    }),
  postalCode: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{8}$/.test(value), {
      message: 'Informe os 8 dígitos do CEP.',
    }),
});

export type CustomerFormInitialValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  intent: 'create' | 'update';
  customerId?: string;
  initialValues?: CustomerFormInitialValues;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
}

interface CustomerResponse {
  data: { id: string; name: string };
}

interface SavedCustomer {
  id: string;
  name: string;
}

const apiUrl = '';
const emptyValues: CustomerFormInitialValues = {
  name: '',
  cpf: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
};

function optional(value: string): string | null {
  const normalized = value.normalize('NFKC').trim();
  return normalized.length > 0 ? normalized : null;
}

export function CustomerForm({
  intent,
  customerId,
  initialValues = emptyValues,
}: CustomerFormProps): React.JSX.Element {
  const [requestError, setRequestError] = useState<string | null>(null);
  const [savedCustomer, setSavedCustomer] = useState<SavedCustomer | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormInitialValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialValues,
  });

  const isCreate = intent === 'create';

  async function submit(fields: CustomerFormInitialValues): Promise<void> {
    setRequestError(null);
    setSavedCustomer(null);

    const payload = {
      name: fields.name.normalize('NFKC').trim(),
      cpf: optional(fields.cpf),
      phone: optional(fields.phone),
      addressLine: optional(fields.addressLine),
      city: optional(fields.city),
      state: optional(fields.state)?.toUpperCase() ?? null,
      postalCode: optional(fields.postalCode),
    };

    try {
      const response = await fetch(
        isCreate
          ? `${apiUrl}/api/v1/customers`
          : `${apiUrl}/api/v1/customers/${customerId}`,
        {
          method: isCreate ? 'POST' : 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        setRequestError(
          body.error?.message ??
            `Não foi possível ${isCreate ? 'cadastrar' : 'atualizar'} o cliente.`,
        );
        return;
      }

      const body = (await response.json()) as CustomerResponse;
      reset(
        isCreate
          ? emptyValues
          : {
              name: payload.name,
              cpf: payload.cpf ?? '',
              phone: payload.phone ?? '',
              addressLine: payload.addressLine ?? '',
              city: payload.city ?? '',
              state: payload.state ?? '',
              postalCode: payload.postalCode ?? '',
            },
      );
      setSavedCustomer({ id: body.data.id, name: body.data.name });
      if (isCreate) setFocus('name');
    } catch {
      setRequestError('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  return (
    <form
      className="mt-8 max-w-3xl border-t border-border pt-7"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Nome" error={errors.name?.message}>
          <Input
            id="customer-name"
            autoComplete="name"
            autoFocus
            maxLength={150}
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
        </Field>
        <Field label="CPF" error={errors.cpf?.message}>
          <Input
            id="customer-cpf"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            aria-invalid={Boolean(errors.cpf)}
            {...register('cpf')}
          />
        </Field>
        <Field label="Telefone" error={errors.phone?.message}>
          <Input
            id="customer-phone"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Endereço"
          error={errors.addressLine?.message}
        >
          <Input
            id="customer-address"
            autoComplete="street-address"
            maxLength={255}
            aria-invalid={Boolean(errors.addressLine)}
            {...register('addressLine')}
          />
        </Field>
        <Field label="Cidade" error={errors.city?.message}>
          <Input
            id="customer-city"
            autoComplete="address-level2"
            maxLength={100}
            aria-invalid={Boolean(errors.city)}
            {...register('city')}
          />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
          <Field label="UF" error={errors.state?.message}>
            <Input
              id="customer-state"
              autoComplete="address-level1"
              maxLength={2}
              className="uppercase"
              aria-invalid={Boolean(errors.state)}
              {...register('state')}
            />
          </Field>
          <Field label="CEP" error={errors.postalCode?.message}>
            <Input
              id="customer-postal-code"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={8}
              aria-invalid={Boolean(errors.postalCode)}
              {...register('postalCode')}
            />
          </Field>
        </div>
      </div>

      {requestError ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requestError}</span>
        </div>
      ) : null}

      {savedCustomer ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-ring bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-ring" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              Cliente {savedCustomer.name} {isCreate ? 'cadastrado' : 'atualizado'}.
            </span>
            {isCreate ? (
              <Link
                href={`/customers/${savedCustomer.id}/edit`}
                aria-label={`Editar ${savedCustomer.name}`}
                className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-ring hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="size-3.5" aria-hidden />
                Editar
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <Button className="mt-6" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            {isCreate ? 'Cadastrando cliente' : 'Salvando alterações'}
          </>
        ) : (
          <>
            {isCreate ? (
              <Plus className="size-4" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {isCreate ? 'Cadastrar cliente' : 'Salvar alterações'}
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  children,
  className,
  error,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
}): React.JSX.Element {
  const id =
    children && typeof children === 'object' && 'props' in children
      ? (children.props as { id?: string }).id
      : undefined;

  return (
    <div className={`space-y-2${className ? ` ${className}` : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
