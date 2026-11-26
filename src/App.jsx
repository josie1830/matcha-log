import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Leaf, Plus, Search, LogOut, Check, Coffee, Package, X } from "lucide-react";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const statusLabels = { want: "想收集", owned: "已入手", opened: "已開封", finished: "已喝完" };

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ brand: "", name: "", country: "", size_g: "", price: "", is_limited: false, status: "want", tasted: false, notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadData(); }, [session]);

  async function loadData() {
    setLoading(true); setError("");
    const [b, p, c] = await Promise.all([
      supabase.from("brands").select("*").order("name"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("collection").select("*")
    ]);
    const problem = b.error || p.error || c.error;
    if (problem) setError(problem.message);
    setBrands(b.data || []); setProducts(p.data || []); setRecords(c.data || []);
    setLoading(false);
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
  }

  async function addProduct(e) {
    e.preventDefault(); setError("");
    let brand = brands.find(x => x.name.trim().toLowerCase() === form.brand.trim().toLowerCase());
    if (!brand) {
      const result = await supabase.from("brands").insert({ name: form.brand.trim(), country: form.country.trim() || null }).select().single();
      if (result.error) { setError(result.error.message); return; }
      brand = result.data;
    }
    const created = await supabase.from("products").insert({
      brand_id: brand.id, name: form.name.trim(),
      size_g: form.size_g ? Number(form.size_g) : null,
      price: form.price ? Number(form.price) : null,
      is_limited: form.is_limited, notes: form.notes.trim() || null
    }).select().single();
    if (created.error) { setError(created.error.message); return; }
    const saved = await supabase.from("collection").insert({
      product_id: created.data.id, status: form.status,
      collected: form.status !== "want", tasted: form.tasted
    });
    if (saved.error) { setError(saved.error.message); return; }
    setForm({ brand: "", name: "", country: "", size_g: "", price: "", is_limited: false, status: "want", tasted: false, notes: "" });
    setShowForm(false); loadData();
  }

  async function updateRecord(productId, changes) {
    const record = records.find(x => x.product_id === productId);
    if (!record) {
      const { error } = await supabase.from("collection").insert({ product_id: productId, status: "want", collected: false, tasted: false, ...changes });
      if (error) setError(error.message);
    } else {
      const next = { ...changes };
      if (changes.status) next.collected = changes.status !== "want";
      const { error } = await supabase.from("collection").update(next).eq("id", record.id);
      if (error) setError(error.message);
    }
    loadData();
  }

  const rows = useMemo(() => products.map(p => {
    const b = brands.find(x => x.id === p.brand_id);
    const c = records.find(x => x.product_id === p.id);
    return { ...p, brandName: b?.name || "未分類", status: c?.status || "want", tasted: !!c?.tasted };
  }).filter(p => (p.name + p.brandName).toLowerCase().includes(query.toLowerCase()))
    .filter(p => filter === "全部" || (filter === "已品飲" ? p.tasted : p.status === Object.keys(statusLabels).find(k => statusLabels[k] === filter))), [products, brands, records, query, filter]);

  const owned = rows.filter(p => p.status !== "want").length;
  const tasted = rows.filter(p => p.tasted).length;

  if (!supabase) return <main className="setup"><Leaf size={38}/><h1>MATCHA LOG</h1><p>先設定 Supabase 連線資訊，就能啟用圖鑑。</p><p>請把專案根目錄的 <code>.env.example</code> 複製成 <code>.env</code>，填入 Supabase Project URL 與 Publishable Key。</p></main>;
  if (loading && !session) return <main className="setup">正在載入 MATCHA LOG…</main>;
  if (!session) return <main className="login"><div className="login-card"><div className="mark"><Leaf size={34}/></div><p className="eyebrow">YOUR PERSONAL MATCHA COLLECTION</p><h1>MATCHA LOG</h1><p>把每一罐喜歡的抹茶，好好收藏起來。</p><button className="primary wide" onClick={signIn}>使用 Google 帳號登入</button><small>私人圖鑑・雲端同步・收藏進度</small>{error && <p className="error">{error}</p>}</div></main>;

  return <main className="app">
    <header><div className="brandmark"><Leaf/><span>MATCHA LOG</span></div><button className="iconbtn" title="登出" onClick={() => supabase.auth.signOut()}><LogOut size={18}/></button></header>
    <section className="hero"><p className="eyebrow">MY MATCHA COLLECTION</p><h1>我的抹茶圖鑑<span>🍵</span></h1><p>每一份收藏，都有自己的故事。</p></section>
    <section className="stats">
      <div><Package/><strong>{products.length}</strong><span>圖鑑品項</span></div>
      <div><Check/><strong>{records.filter(r => r.collected).length}</strong><span>已收藏</span></div>
      <div><Coffee/><strong>{records.filter(r => r.tasted).length}</strong><span>已品飲</span></div>
    </section>
    <div className="toolbar"><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋品牌或品項"/></div><button className="primary add" onClick={() => setShowForm(true)}><Plus size={18}/> 新增</button></div>
    <nav className="filters">{["全部","想收集","已入手","已開封","已喝完","已品飲"].map(x => <button key={x} className={filter===x?"active":""} onClick={() => setFilter(x)}>{x}</button>)}</nav>
    {error && <div className="errorbox">{error}</div>}
    {loading ? <p className="empty">正在同步資料…</p> : rows.length === 0 ? <div className="empty"><span>🍃</span><h3>圖鑑還是空的</h3><p>新增第一款抹茶，開始累積收藏吧！</p><button className="primary" onClick={() => setShowForm(true)}>新增第一款</button></div> :
      <section className="cards">{rows.map(p => <article className="product" key={p.id}>
        <div className="product-art"><Leaf size={28}/>{p.is_limited && <span className="limited">LIMITED</span>}</div>
        <div className="product-info"><small>{p.brandName}</small><h3>{p.name}</h3><p>{[p.size_g ? `${p.size_g}g` : "", p.price ? `NT$ ${p.price}` : ""].filter(Boolean).join(" · ") || "尚未填寫規格"}</p>
          <div className="product-controls"><select value={p.status} onChange={e => updateRecord(p.id, {status:e.target.value})}>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><label><input type="checkbox" checked={p.tasted} onChange={e => updateRecord(p.id,{tasted:e.target.checked})}/> 品飲過</label></div>
        </div>
      </article>)}</section>}
    <footer>MADE FOR MATCHA LOVERS · 私人收藏圖鑑</footer>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal" onSubmit={addProduct} onClick={e => e.stopPropagation()}>
      <div className="modal-head"><h2>新增抹茶品項</h2><button type="button" className="iconbtn" onClick={() => setShowForm(false)}><X/></button></div>
      <label>品牌名稱<input required value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="例如：丸久小山園"/></label>
      <label>產地／國家（選填）<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="例如：日本"/></label>
      <label>品項名稱<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="例如：五十鈴"/></label>
      <div className="two"><label>容量（g）<input type="number" min="0" step="0.1" value={form.size_g} onChange={e=>setForm({...form,size_g:e.target.value})}/></label><label>價格（NT$）<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div>
      <label>收藏狀態<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={form.is_limited} onChange={e=>setForm({...form,is_limited:e.target.checked})}/> 季節限定／限量品</label>
      <label className="check"><input type="checkbox" checked={form.tasted} onChange={e=>setForm({...form,tasted:e.target.checked})}/> 已經品飲過</label>
      <label>備註（選填）<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="風味、心得、購買地點…"/></label>
      <button className="primary wide" type="submit">加入我的圖鑑</button>
    </form></div>}
  </main>;
}