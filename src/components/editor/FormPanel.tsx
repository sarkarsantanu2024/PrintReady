import { useEffect } from 'react';
import { useForm, type DefaultValues, type Path, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z, ZodTypeAny } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface FieldConfig<T> {
  name: Path<T>;
  label: string;
  type?: 'text' | 'email' | 'date' | 'image' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  span?: 1 | 2;
}

interface FormPanelProps<S extends ZodTypeAny> {
  schema: S;
  defaults: DefaultValues<z.infer<S>>;
  fields: FieldConfig<z.infer<S>>[];
  onChange?: (values: z.infer<S>) => void;
  onSubmit?: SubmitHandler<z.infer<S>>;
  submitLabel?: string;
  /** Reset the form when this key changes (e.g. switching layouts). */
  resetKey?: string;
}

export function FormPanel<S extends ZodTypeAny>({
  schema,
  defaults,
  fields,
  onChange,
  onSubmit,
  submitLabel,
  resetKey,
}: FormPanelProps<S>) {
  type Values = z.infer<S>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onChange',
  });

  // Live preview wiring
  useEffect(() => {
    if (!onChange) return;
    const sub = form.watch((values) => onChange(values as Values));
    return () => sub.unsubscribe();
  }, [form, onChange]);

  // Reset when switching layout
  useEffect(() => {
    form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleImageUpload = (name: Path<Values>, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      form.setValue(name, reader.result as Values[Path<Values>], {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit ? form.handleSubmit(onSubmit) : (e) => e.preventDefault()}
      noValidate
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => {
          const error = form.formState.errors[field.name as keyof typeof form.formState.errors];
          const errorMsg = (error as { message?: string } | undefined)?.message;

          return (
            <div key={String(field.name)} className={field.span === 1 ? '' : 'col-span-2'}>
              <Label htmlFor={String(field.name)} className="mb-1.5 block">
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </Label>

              {field.type === 'textarea' ? (
                <Textarea
                  id={String(field.name)}
                  placeholder={field.placeholder}
                  {...form.register(field.name)}
                  aria-invalid={!!error}
                />
              ) : field.type === 'image' ? (
                <Input
                  id={String(field.name)}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(field.name, f);
                  }}
                />
              ) : field.type === 'checkbox' ? (
                <label className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-primary"
                    {...form.register(field.name)}
                  />
                  {field.placeholder ?? 'Enable'}
                </label>
              ) : (
                <Input
                  id={String(field.name)}
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  {...form.register(field.name)}
                  aria-invalid={!!error}
                />
              )}

              {errorMsg && <p className="mt-1 text-xs text-destructive">{errorMsg}</p>}
            </div>
          );
        })}
      </div>

      {onSubmit && (
        <Button type="submit" size="lg" className="w-full">
          {submitLabel ?? 'Save'}
        </Button>
      )}
    </form>
  );
}
