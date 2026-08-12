import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { claimAdminIfUnclaimed, grantAdminByEmail } from "@/lib/admin.functions";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

type Product = {
  id: string;
  name: string;
  price: string;
  note: string;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
};

type Draft = {
  name: string;
  price: string;
  note: string;
  sort_order: string;
  is_visible: boolean;
};

const EMPTY_DRAFT: Draft = { name: "", price: "", note: "", sort_order: "0", is_visible: true };

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage Catalogue — hoor nails" },
      { name: "description", content: "Add, edit and remove nail designs in the hoor nails catalogue." },
      { property: "og:title", content: "Manage Catalogue — hoor nails" },
      { property: "og:description", content: "Add, edit and remove nail designs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
      try {
        await claimAdminIfUnclaimed();
      } catch {
        /* ignore — role may already exist */
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("role", "admin");
      const admin = (roles?.length ?? 0) > 0;
      setIsAdmin(admin);
      if (admin) await loadProducts();
    })();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, note, image_url, sort_order, is_visible")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setStatus(error.message);
    else setProducts(data ?? []);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("nail-photos")
      .upload(path, file, file.type ? { contentType: file.type } : undefined);
    if (error) throw error;
    const { data, error: signErr } = await supabase.storage
      .from("nail-photos")
      .createSignedUrl(path, TEN_YEARS);
    if (signErr) throw signErr;
    return data.signedUrl;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const imageUrl = await uploadPhoto();
      const payload = {
        name: draft.name.trim(),
        price: draft.price.trim(),
        note: draft.note.trim(),
        sort_order: Number(draft.sort_order) || 0,
        is_visible: draft.is_visible,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        setStatus("Design updated.");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        setStatus("Design added.");
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setFile(null);
    setEditingId(null);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      price: p.price,
      note: p.note,
      sort_order: String(p.sort_order),
      is_visible: p.is_visible,
    });
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this design?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) setStatus(error.message);
    else await loadProducts();
  }

  async function toggleVisible(p: Product) {
    const { error } = await supabase
      .from("products")
      .update({ is_visible: !p.is_visible })
      .eq("id", p.id);
    if (error) setStatus(error.message);
    else await loadProducts();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await grantAdminByEmail({ data: { email: inviteEmail } });
      setInviteEmail("");
      setStatus("Access granted.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setBusy(false);
    }
  }

  if (isAdmin === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-xl font-semibold">No access yet</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Signed in as {email}. Ask the owner to grant you admin access from their admin page.
          </p>
          <button
            onClick={signOut}
            className="mt-5 rounded-xl border border-input px-4 py-2 font-body text-sm"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Manage catalogue</h1>
            <p className="font-body text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-input px-3 py-1.5 font-body text-xs"
            >
              View site
            </Link>
            <button
              onClick={signOut}
              className="rounded-xl border border-input px-3 py-1.5 font-body text-xs"
            >
              Sign out
            </button>
          </div>
        </header>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <h2 className="font-display text-base font-semibold">
            {editingId ? "Edit design" : "Add a design"}
          </h2>
          <input
            required
            maxLength={80}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name (e.g. Pink Ombré)"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 font-body text-sm"
          />
          <input
            maxLength={20}
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            placeholder="Price (e.g. $52)"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 font-body text-sm"
          />
          <textarea
            maxLength={200}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Short description"
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 font-body text-sm"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              placeholder="Order"
              className="w-24 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm"
            />
            <label className="flex items-center gap-2 font-body text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.is_visible}
                onChange={(e) => setDraft({ ...draft, is_visible: e.target.checked })}
              />
              Show on site
            </label>
          </div>
          <label className="block font-body text-xs text-muted-foreground">
            Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full font-body text-xs"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-body text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Add design"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-input px-4 py-2.5 font-body text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {status && <p className="mt-3 font-body text-xs text-rose">{status}</p>}

        <section className="mt-6 space-y-3">
          <h2 className="font-display text-base font-semibold">
            Designs <span className="font-body text-xs text-muted-foreground">({products.length})</span>
          </h2>
          {products.map((p) => (
            <article
              key={p.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-body text-[0.6rem] text-muted-foreground">
                    no photo
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-display text-sm font-semibold">{p.name}</h3>
                  <span className="font-body text-sm font-bold text-rose">{p.price}</span>
                </div>
                <p className="truncate font-body text-xs text-muted-foreground">{p.note}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-input px-2 py-1 font-body text-[0.7rem]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleVisible(p)}
                    className="rounded-lg border border-input px-2 py-1 font-body text-[0.7rem]"
                  >
                    {p.is_visible ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded-lg border border-destructive/40 px-2 py-1 font-body text-[0.7rem] text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <form
          onSubmit={invite}
          className="mt-8 space-y-2 rounded-2xl border border-border bg-card p-4"
        >
          <h2 className="font-display text-base font-semibold">Give a staff member access</h2>
          <p className="font-body text-xs text-muted-foreground">
            They sign up first at /auth, then enter their email here.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="staff@email.com"
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-secondary px-4 py-2 font-body text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              Grant
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
