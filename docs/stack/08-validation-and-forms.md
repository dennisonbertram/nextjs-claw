# 08 — Validation and Forms (Zod + react-hook-form)

## What this gives you

Schema-first validation using Zod, with types inferred from the schema so you never write the same type twice. The same schema validates on the client (with react-hook-form) AND on the server (in API routes and Server Actions). Includes a `safeParse` helper, a Server Action pattern, and a complete form example.

## When to reach for it / when not to

- **Use Zod** for every API route input, every form, every config object loaded from the environment.
- **Use react-hook-form** for any form with more than 2 fields — it avoids unnecessary re-renders and integrates with Zod via `@hookform/resolvers`.
- **Skip react-hook-form** for trivial 1–2 field forms where a controlled input is cleaner.
- **Skip**: building a custom validation DSL. Zod's API is expressive enough.

## Decision rationale

**Zod over Yup, Joi, AJV**: Zod has first-class TypeScript inference (`z.infer<>`), runs in both Node and the browser with no config, and has a clean functional API. Its parse functions (`parse`, `safeParse`) return typed results. Yup is fine but its TypeScript support is weaker. AJV is faster but not ergonomic.

**react-hook-form over Formik**: react-hook-form uses uncontrolled inputs by default — zero re-renders while typing. Formik re-renders on every keystroke. For complex forms this matters.

## Files the agent creates

- `lib/validation/index.ts` — `safeParse` helper + common validators
- `lib/validation/schemas/auth.ts` — signup/login schemas
- `app/preview/components/SignupForm.tsx` — example form with validation

## Code

### `lib/validation/index.ts`

```ts
// lib/validation/index.ts
import { z, ZodSchema, ZodError } from 'zod';
export { z } from 'zod';

// Typed result union — mirrors Rust's Result<T, E> pattern
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string[]> };

// Parse and return a flat error map on failure
export function safeParse<T>(
  schema: ZodSchema<T>,
  input: unknown,
): ParseResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  }
  return { ok: false, errors };
}

// Parse request body (JSON) in a Next.js route handler
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, errors: { _root: ['Invalid JSON body'] } };
  }
  return safeParse(schema, body);
}

// Parse FormData from a Server Action
export function parseFormData<T>(
  formData: FormData,
  schema: ZodSchema<T>,
): ParseResult<T> {
  const obj = Object.fromEntries(formData.entries());
  return safeParse(schema, obj);
}

// Common field validators
export const validators = {
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').trim(),
  url: z.string().url('Invalid URL'),
  uuid: z.string().uuid('Invalid ID'),
  positiveInt: z.number().int().positive(),
  nonEmptyString: z.string().min(1, 'This field is required').trim(),
};
```

### `lib/validation/schemas/auth.ts`

```ts
// lib/validation/schemas/auth.ts
import { z } from 'zod';
import { validators } from '../index';

export const signupSchema = z.object({
  email: validators.email,
  password: validators.password,
  confirmPassword: validators.password,
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: validators.email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: validators.email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: validators.password,
  confirmPassword: validators.password,
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### `app/preview/components/SignupForm.tsx`

```tsx
// app/preview/components/SignupForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@/lib/validation/schemas/auth';
import { useState } from 'react';

export default function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupInput) {
    setServerError(null);
    const res = await fetch('/preview/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? 'Something went wrong');
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <p className="text-green-600">
        Check your email to verify your account.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
```

### Server Action pattern

```ts
// app/preview/actions/update-profile.ts
'use server';

import { z } from 'zod';
import { parseFormData } from '@/lib/validation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const result = parseFormData(formData, updateProfileSchema);
  if (!result.ok) {
    return { error: Object.values(result.errors).flat().join(', ') };
  }

  // Update user record (add 'name' column to schema first)
  // await db.update(users).set({ name: result.data.name }).where(eq(users.id, user.id));

  return { ok: true };
}
```

```tsx
// Using a Server Action in a form:
import { updateProfile } from '@/app/preview/actions/update-profile';

export default function ProfileForm() {
  return (
    <form action={updateProfile}>
      <input name="name" type="text" />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Commands to run

```bash
bun add -E zod react-hook-form @hookform/resolvers
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add a form', 'validate input', 'add a signup form', 'validate API data': follow `docs/stack/08-validation-and-forms.md`. Run `bun add -E zod react-hook-form @hookform/resolvers`. Create the schema in `lib/validation/schemas/`. Use `safeParse` in API routes. Use `zodResolver` in client forms."

## Common pitfalls

- **Server and client schemas must match**: If you add `z.transform()` to the server schema (e.g., coerce types), make sure the client schema produces compatible types. Transformations run on parse, not on type inference.
- **`parseFormData` for Server Actions**: FormData values are always strings. Use `z.coerce.number()` for numeric fields, not `z.number()`.
- **`confirmPassword` is validated but should not be sent to the server**: Strip it before posting to the API. react-hook-form's `handleSubmit` gives you the form data — spread-destructure to omit `confirmPassword` if needed.
- **Error path separators**: The `safeParse` helper joins path segments with `.`. For nested schemas (`address.street`), this works as expected.
- **react-hook-form and Server Components**: react-hook-form is client-only. Use `'use client'` on any form component. The schema (`z.object({...})`) can be defined in a shared non-client file and imported by both.
- **zod v4**: If context7 shows a v4 API, note that `z.string().email()` behavior and error messages changed slightly. Verify the API you're using.

## Further reading

- Zod docs (context7 query: `zod`)
- react-hook-form docs (context7 query: `react-hook-form`)
- `@hookform/resolvers` (context7 query: `@hookform/resolvers`)
