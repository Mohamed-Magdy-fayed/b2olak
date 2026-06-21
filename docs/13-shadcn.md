# shadcn/ui Component Guide — ba2olak

Everything an AI session needs to compose UI correctly in this codebase. Read this before
touching any component under `apps/web` or `packages/ui`.

## TL;DR rules

1. **Import from `@workspace/ui/components/<name>`** — there is no barrel `index.ts`.
2. **Use `cn()` to extend classes** — never string-concat or override without it.
3. **Add a CVA variant, don't fork inline** — if a component needs a new visual style,
   extend its `*Variants` object; don't copy-paste the component with different classes.
4. **No raw color classes** — `bg-red-500`, `text-blue-600`, etc. are banned; use semantic
   tokens (see [Color tokens](#color-tokens)).
5. **Compose sub-components** — `Card`, `Dialog`, `DropdownMenu`, etc. are multi-part; use
   all the named exports together, don't build a div that mimics one.
6. **Headings = Typography components** — never `<h2 className="text-xl font-bold">`;
   use `<H2>` from typography.
7. **Status banners = `<Alert>`** — never a raw `<div>` with colored background for
   info/warning/error/success messages.
8. **Status chips = `<Badge>`** — never a raw `<span>` with manual ring/border styling.

---

## `cn()` — class merging helper

```ts
import { cn } from "@workspace/ui/lib/utils";

// merge defaults with caller overrides, resolving Tailwind conflicts
<div className={cn("p-4 bg-muted", className)} />
```

Under the hood: `clsx` (conditional classes) + `tailwind-merge` (conflict resolution, so
the caller's class wins). Always pass `className` through `cn()`, never concatenate.

---

## Color tokens

All semantic colors are CSS custom properties defined in `packages/ui/src/styles/globals.css`
using OKLCH. Never use Tailwind palette classes — use these tokens:

| Semantic role | Token classes |
|---|---|
| Primary / brand | `bg-primary text-primary-foreground` |
| Secondary / subtle | `bg-secondary text-secondary-foreground` |
| Destructive / error | `bg-destructive text-destructive-foreground` |
| Muted / neutral | `bg-muted text-muted-foreground` |
| Accent (hover bg) | `bg-accent text-accent-foreground` |
| Card surface | `bg-card text-card-foreground` |
| Popover surface | `bg-popover text-popover-foreground` |
| Border | `border-border` |
| Input border | `border-input` |
| Focus ring | `ring-ring` |

For states not covered by a token (success, warning), use the pattern from `Badge`:

```
success  → bg-emerald-500/10  text-emerald-600  border-emerald-500
warning  → bg-amber-500/10    text-amber-600    border-amber-500
```

Dark-mode overrides are automatic — the `.dark` selector redefines all the same custom
properties; you never need `dark:` prefixes on token classes.

---

## CVA — adding variants

Two components export their `*Variants` object so callers can compose:

- `buttonVariants` from `@workspace/ui/components/button`
- `badgeVariants` from `@workspace/ui/components/badge`

**To add a new visual style:** edit the CVA `variants` map in the component file. Do not
copy the component and hard-code classes.

```ts
// packages/ui/src/components/badge.tsx — add a new variant
const badgeVariants = cva("...", {
  variants: {
    variant: {
      default: "...",
      success: "bg-emerald-500/10 text-emerald-600 border-emerald-500",
      // add yours here ↓
      info: "bg-primary/10 text-primary border-primary",
    },
  },
});
```

---

## Component catalog

### Alert

Use for **status banners** — info, warning, error, success messages inside a page.

```tsx
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

<Alert variant="destructive">
  <AlertDescription>{t("order.failedToPlace")}</AlertDescription>
</Alert>
```

| Variant | When |
|---|---|
| `default` | Neutral info |
| `destructive` | Error / danger |

For success/warning, use `Alert` with a custom `className` applying the success/warning
color pattern above (no built-in variant for these yet — add one if needed).

---

### Badge

Use for **status chips** — order status, item tags, role labels.

```tsx
import { Badge } from "@workspace/ui/components/badge";

<Badge variant="success">{t("order.status.delivered")}</Badge>
```

| Variant | When |
|---|---|
| `default` | Primary / active |
| `secondary` | Neutral / pending |
| `destructive` | Cancelled / error |
| `outline` | Low-emphasis label |
| `success` | Delivered / confirmed |
| `warning` | In-progress / delayed |

---

### Button

The most extended component. Wraps `@base-ui/react/button`.

```tsx
import { Button } from "@workspace/ui/components/button";

<Button variant="default" size="default">
  {t("action.placeOrder")}
</Button>
```

**Variants:** `default` · `outline` · `secondary` · `ghost` · `destructive` · `link`

**Sizes:** `default` · `xs` · `sm` · `lg` · `xl` · `icon` · `icon-xs` · `icon-sm` · `icon-lg`

**Icons:** use `data-[icon=inline-start]` / `data-[icon=inline-end]` on the icon element
for automatic spacing (don't add margin manually).

```tsx
<Button variant="outline">
  <PlusIcon data-icon="inline-start" />
  {t("action.addItem")}
</Button>
```

---

### Card

Use for **content panels, list cards, form sections**.

```tsx
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter, CardAction,
} from "@workspace/ui/components/card";

<Card>
  <CardHeader>
    <CardTitle>{t("order.summary")}</CardTitle>
    <CardDescription>{t("order.reviewBeforeSubmit")}</CardDescription>
    <CardAction>
      <Button variant="ghost" size="icon"><EditIcon /></Button>
    </CardAction>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

`CardAction` is placed in the grid column to the right of title/description — use it for
per-card action buttons, not for primary CTAs (those go in `CardFooter`).

---

### Calendar

Wraps `react-day-picker`. RTL-aware (chevrons flip). Use inside a `Popover` for date pickers.

```tsx
import { Calendar } from "@workspace/ui/components/calendar";

<Calendar mode="single" selected={date} onSelect={setDate} />
```

---

### Checkbox

Styled native `<input type="checkbox">`. Use the `onCheckedChange` prop (not `onChange`).

```tsx
import { Checkbox } from "@workspace/ui/components/checkbox";

<Checkbox checked={accepted} onCheckedChange={setAccepted} />
```

---

### Dialog

Wraps `@base-ui/react/dialog`. Use for **modal flows** — confirmations, forms, detail views.

```tsx
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@workspace/ui/components/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>{t("action.cancel")}</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t("dialog.cancelOrder.title")}</DialogTitle>
      <DialogDescription>{t("dialog.cancelOrder.body")}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">{t("action.back")}</Button>
      </DialogClose>
      <Button variant="destructive" onClick={onConfirm}>
        {t("action.confirm")}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Scrollable content: wrap `<DialogContent>` body in a div with `overflow-y-auto max-h-[70vh]`
and keep `<DialogFooter>` outside it.

---

### Dropdown Menu

Wraps `@base-ui/react/menu`. Use for **action menus, kebab menus, context menus**.

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontalIcon /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>{t("action.edit")}</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">{t("action.delete")}</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

`DropdownMenuItem` accepts `variant="destructive"` for danger actions. Use `inset` on
`DropdownMenuLabel` when items have icons, to align text.

---

### Field

Form field wrapper. Handles label + description + error display. Pairs with TanStack Form.

```tsx
import {
  Field, FieldLabel, FieldContent, FieldDescription, FieldError,
} from "@workspace/ui/components/field";

<Field orientation="vertical">
  <FieldLabel>{t("form.phone")}</FieldLabel>
  <FieldContent>
    <PhoneInput … />
  </FieldContent>
  <FieldDescription>{t("form.phone.hint")}</FieldDescription>
  <FieldError errors={field.state.meta.errors} />
</Field>
```

`orientation`: `"vertical"` (default, stacked) · `"horizontal"` (label left, control right).
`FieldError` automatically deduplicates error messages from the errors array.

---

### Input / Textarea

Styled native elements. Use `aria-invalid` for error state (set by `Field` wrapper automatically
when `data-invalid` is present on the parent `Field`).

```tsx
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";

<Input type="text" placeholder={t("form.itemName.placeholder")} />
<Textarea placeholder={t("form.note.placeholder")} />
```

`Textarea` is content-sized by default (`field-sizing-content`), with a minimum height of 4 rows.

---

### Label

Simple `<label>` wrapper. Prefer `FieldLabel` (which composes this) inside forms.

```tsx
import { Label } from "@workspace/ui/components/label";
<Label htmlFor="phone">{t("form.phone")}</Label>
```

---

### Phone Input

Egypt-first phone input with country code selector. Default country: EG. Countries: EG + 15
other Middle Eastern/Arabic countries.

```tsx
import { PhoneInput } from "@workspace/ui/components/phone-input";

<PhoneInput value={phone} onChange={setPhone} placeholder="+20 10X XXX XXXX" />
```

Always renders digits LTR (`dir="ltr"`) regardless of locale — do not override this.

---

### Popover

Wraps `@base-ui/react/popover`. Use for **non-modal overlays** — tooltips with rich content,
date pickers, color pickers.

```tsx
import {
  Popover, PopoverTrigger, PopoverContent,
  PopoverHeader, PopoverTitle,
} from "@workspace/ui/components/popover";

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">{t("filter.date")}</Button>
  </PopoverTrigger>
  <PopoverContent side="bottom" align="start">
    <PopoverHeader>
      <PopoverTitle>{t("filter.pickDate")}</PopoverTitle>
    </PopoverHeader>
    <Calendar … />
  </PopoverContent>
</Popover>
```

---

### Scroll Area

Thin semantic wrapper for scrollable regions. Use instead of `overflow-y-auto` on raw divs
when you want consistent scrollbar styling.

```tsx
import { ScrollArea } from "@workspace/ui/components/scroll-area";

<ScrollArea className="h-64">
  {items.map(…)}
</ScrollArea>
```

---

### Select

Wraps `@base-ui/react/select`. Use for **option pickers** with a small-to-medium option list.

```tsx
import {
  Select, SelectTrigger, SelectContent,
  SelectItem, SelectValue,
} from "@workspace/ui/components/select";

<Select value={status} onValueChange={setStatus}>
  <SelectTrigger size="default">
    <SelectValue placeholder={t("filter.status")} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pending">{t("order.status.pending")}</SelectItem>
    <SelectItem value="delivered">{t("order.status.delivered")}</SelectItem>
  </SelectContent>
</Select>
```

`SelectTrigger` sizes: `"default"` · `"sm"`.

---

### Separator

Horizontal or vertical rule. Wraps `@base-ui/react/separator`.

```tsx
import { Separator } from "@workspace/ui/components/separator";

<Separator />                          {/* horizontal (default) */}
<Separator orientation="vertical" />   {/* vertical */}
```

---

### Skeleton

Animated loading placeholder. Use for **loading states** of known-shape content.

```tsx
import { Skeleton } from "@workspace/ui/components/skeleton";

<Skeleton className="h-4 w-48" />   {/* text line */}
<Skeleton className="h-24 w-full" /> {/* card */}
```

---

### Slider

Wraps `@base-ui/react/slider`. Always rendered LTR (`dir="ltr"`). Supports multiple thumbs.

```tsx
import { Slider } from "@workspace/ui/components/slider";

<Slider min={0} max={100} value={50} onValueChange={setVal} />
```

---

### Table

Use for **admin data tables**. See `docs/12-ai-setup-backlog.md` item 6 for the full
DataTable pattern (server-side pagination + sorting + filters).

```tsx
import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from "@workspace/ui/components/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>{t("table.col.id")}</TableHead>
      <TableHead>{t("table.col.status")}</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((row) => (
      <TableRow key={row.id} data-state={selected ? "selected" : undefined}>
        <TableCell>{row.id}</TableCell>
        <TableCell><Badge variant="secondary">{row.status}</Badge></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

`Table` wraps the `<table>` in a container div for horizontal scroll — no extra wrapper needed.

---

### Tooltip

Wraps `@base-ui/react/tooltip`. Use for **icon button labels** and short contextual hints.
Requires `TooltipProvider` at the layout level (already set in web layout).

```tsx
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@workspace/ui/components/tooltip";

<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon"><TrashIcon /></Button>
  </TooltipTrigger>
  <TooltipContent>{t("action.delete")}</TooltipContent>
</Tooltip>
```

---

### Typography

Never use raw heading tags or ad-hoc text sizing. Import from typography:

```tsx
import {
  H1, H2, H3, H4, H5, H6,
  P, Lead, Large, Small, Muted, Blockquote, InlineCode,
} from "@workspace/ui/components/typography";

<H1>{t("page.home.hero")}</H1>
<Lead>{t("page.home.subhead")}</Lead>
<P>{t("page.home.body")}</P>
<Muted>{t("order.createdAt", { date })}</Muted>
```

| Component | Renders | Typical use |
|---|---|---|
| `H1` | `<h1>` responsive xl→4xl | Page title |
| `H2` | `<h2>` + bottom border | Section heading |
| `H3–H6` | `<h3>`–`<h6>` responsive | Sub-sections |
| `Lead` | `<p>` large muted | Subtitle / intro |
| `P` | `<p>` base | Body copy |
| `Large` | `<p>` large semibold | Callout text |
| `Small` | `<small>` | Fine print |
| `Muted` | `<p>` muted-foreground | Hints, timestamps |
| `Blockquote` | `<blockquote>` | Pull quotes |
| `InlineCode` | `<code>` monospace | Code snippets |

All headings include `scroll-margin-top` for anchor-link offset.

---

## What does NOT exist (don't hand-roll these — add to `packages/ui` instead)

These patterns are missing from the library. If you need them, add a proper component:

- Combobox / searchable select (needs `@base-ui/react/combobox` or a listbox + input)
- Toast / notification system
- Tabs
- Accordion
- Navigation menu
- Sheet / drawer
- Command palette

---

## RTL checklist

Every component in this library is RTL-safe for layout purposes. When extending:

- Logical props only: `ms-` / `me-` / `ps-` / `pe-`, never `ml-` / `mr-` / `pl-` / `pr-`.
- Directional icons (chevrons, arrows): add `rtl:rotate-180` or use the pattern in
  `calendar.tsx` and `dropdown-menu.tsx`.
- The `PhoneInput` digit field is intentionally `dir="ltr"` — never override it.
