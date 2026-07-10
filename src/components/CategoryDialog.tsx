import { useEffect, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLedger } from "@/lib/ledger/store";
import { CATEGORY_KINDS, DEFAULT_CATEGORY_COLOR, type Category, type CategoryKind } from "@/lib/ledger/types";
import { useT } from "@/lib/i18n/I18nProvider";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  /** Preselects (and, for a new category, locks in spirit) the kind — e.g.
   *  opened from an expense transaction or the Budgets page. */
  defaultKind?: CategoryKind;
  /** Called with the new/edited category's id right after it's created. */
  onDone?: (categoryId: string) => void;
}

export default function CategoryDialog({ open, onOpenChange, category, defaultKind, onDone }: CategoryDialogProps) {
  const { createCategory, updateCategory } = useLedger();
  const t = useT();
  const Lc = t.pluto.categories;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setKind(category?.kind ?? defaultKind ?? "expense");
      setColor(category?.color ?? DEFAULT_CATEGORY_COLOR);
    }
  }, [open, category, defaultKind]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (category) {
      updateCategory(category.id, { name: name.trim(), color });
    } else {
      const id = createCategory({ name, kind, color });
      onDone?.(id);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{category ? Lc.editCategory : Lc.newCategory}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{Lc.name}</Label>
            <Input id="category-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={Lc.namePlaceholder} />
          </div>
          {!category && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{Lc.kind}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((k) => <SelectItem key={k} value={k}>{Lc[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{Lc.color}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={!name.trim()} className="bg-primary text-primary-foreground hover:bg-primary-deep">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
