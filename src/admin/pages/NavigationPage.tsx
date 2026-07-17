import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {ArrowDown, ArrowLeft, ArrowUp, Check, Copy, FileText, Link2, Plus, RefreshCw, Save, Search, Trash2, X} from 'lucide-react';
import {Link, useSearchParams} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {ActionMenu} from '../components/ActionMenu';
import type {NavigationItem, NavigationMenu} from '../types';

const menus: Array<{value: NavigationMenu; label: string}> = [
  {value: 'primary', label: 'Primary menu'}, {value: 'services', label: 'Services mega menu'}, {value: 'shop', label: 'Shop mega menu'}, {value: 'footer-services', label: 'Footer · Services'}, {value: 'footer-shop', label: 'Footer · Shop'}, {value: 'footer-company', label: 'Footer · Company'},
];
type EditState = Pick<NavigationItem, 'id' | 'menu' | 'label' | 'url' | 'description' | 'active'>;
const emptyItem = (menu: NavigationMenu): EditState => ({id: '', menu, label: '', url: '/', description: '', active: true});
type NavigationPageProps = {embedded?: boolean; requestedItemId?: string; requestedNewMenu?: NavigationMenu | null; onItemsChange?: (items: NavigationItem[]) => void; onClose?: () => void};

export function NavigationPage({embedded = false, requestedItemId = '', requestedNewMenu = null, onItemsChange, onClose}: NavigationPageProps = {}) {
  const {user} = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const canWrite = user?.role === 'owner' || user?.role === 'editor';
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [menu, setMenu] = useState<NavigationMenu>('primary');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = async () => {setLoading(true); setError(''); try {setItems((await adminApi<{items: NavigationItem[]}>('/navigation')).items);} catch (nextError) {setError(errorMessage(nextError));} finally {setLoading(false);}};
  useEffect(() => {void load();}, []);
  useEffect(() => {
    const requestedMenu = embedded ? requestedNewMenu : params.get('new') as NavigationMenu | null;
    if (!canWrite || !requestedMenu || !menus.some(item => item.value === requestedMenu)) return;
    setMenu(requestedMenu); setEditing(emptyItem(requestedMenu));
    if (!embedded) {const next = new URLSearchParams(params); next.delete('new'); setParams(next, {replace: true});}
  }, [canWrite, embedded, params, requestedNewMenu, setParams]);
  useEffect(() => {const target = items.find(item => item.id === (embedded ? requestedItemId : params.get('item'))); if (target && editing?.id !== target.id) {setMenu(target.menu); setEditing({...target});}}, [editing?.id, embedded, items, params, requestedItemId]);
  useEffect(() => {if (!loading) onItemsChange?.(items);}, [items, loading, onItemsChange]);
  const shown = useMemo(() => items.filter(item => item.menu === menu && (!query || `${item.label} ${item.url} ${item.description}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b) => a.position - b.position), [items, menu, query]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    try {const result = editing.id ? await adminApi<{item: NavigationItem}>(`/navigation/${editing.id}`, {method:'PATCH', body:JSON.stringify(editing)}) : await adminApi<{item: NavigationItem}>('/navigation', {method:'POST', body:JSON.stringify(editing)}); setItems(current => [...current.filter(item => item.id !== result.item.id), result.item]); setEditing(null); setNotice('Navigation item saved.'); window.dispatchEvent(new CustomEvent('nk-admin-guide:navigation-saved', {detail: result.item}));}
    catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}
  };
  const update = async (item: NavigationItem, values: Partial<NavigationItem>) => {setBusy(true); setError(''); try {const result = await adminApi<{item: NavigationItem}>(`/navigation/${item.id}`, {method:'PATCH', body:JSON.stringify({...item,...values})}); setItems(current => current.map(value => value.id === item.id ? result.item : value)); setNotice(result.item.active ? 'Link activated.' : 'Link deactivated.');} catch(nextError){setError(errorMessage(nextError));} finally{setBusy(false);}};
  const duplicate = async (item: NavigationItem) => {setBusy(true); try {const result = await adminApi<{item: NavigationItem}>(`/navigation/${item.id}/duplicate`, {method:'POST'}); setItems(current => [...current,result.item]); setEditing(result.item); setNotice('Inactive copy created.');} catch(nextError){setError(errorMessage(nextError));} finally{setBusy(false);}};
  const remove = async (item: NavigationItem) => {if(!window.confirm(`Permanently delete “${item.label}” from navigation?`)) return; setBusy(true); try {await adminApi(`/navigation/${item.id}`, {method:'DELETE'}); setItems(current=>current.filter(value=>value.id!==item.id)); if(editing?.id===item.id)setEditing(null); setNotice('Navigation item deleted.');} catch(nextError){setError(errorMessage(nextError));} finally{setBusy(false);}};
  const move = async (item: NavigationItem, direction: -1|1) => {const ordered=items.filter(value=>value.menu===item.menu).sort((a,b)=>a.position-b.position); const index=ordered.findIndex(value=>value.id===item.id); const target=index+direction; if(target<0||target>=ordered.length)return; [ordered[index],ordered[target]]=[ordered[target],ordered[index]]; const next=ordered.map((value,position)=>({...value,position})); setItems(current=>current.map(value=>next.find(item=>item.id===value.id)||value)); setBusy(true); try{await adminApi('/navigation/reorder',{method:'PATCH',body:JSON.stringify({menu:item.menu,ids:next.map(value=>value.id)})});setNotice('Navigation order updated.');}catch(nextError){setError(errorMessage(nextError));void load();}finally{setBusy(false);}};

  return <div className={embedded ? 'nk-admin-navigation-embedded' : ''}>
    {embedded
      ? <header className="nk-admin-navigation-embedded-header"><div><span>MENUS / LINK CONTROL</span><h2>Navigation</h2><p>Edit top-level links, mega menus and footer menus without leaving Pages.</p></div><div>{canWrite&&<button className="nk-admin-primary" data-guide="new-navigation-link" onClick={()=>setEditing(emptyItem(menu))}><Plus/>Add link</button>}{onClose&&<button onClick={onClose}><ArrowLeft/>Back to pages</button>}</div></header>
      : <PageHeading eyebrow="SITE STRUCTURE / MENUS" title="Navigation menus" description="Control desktop mega menus, mobile navigation and footer links from one ordered source." actions={<><Link to="/admin/site-pages"><FileText/>Pages</Link>{canWrite && <button className="nk-admin-primary" data-guide="new-navigation-link" onClick={()=>setEditing(emptyItem(menu))}><Plus/>Add link</button>}</>}/>}
    {error&&<p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X/></button></p>}{notice&&<p className="nk-admin-alert" role="status"><Check/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    <div className={`nk-admin-navigation-layout${editing ? ' has-editor' : ''}`}><section className="nk-admin-navigation-index"><div className="nk-admin-navigation-tabs" role="tablist">{menus.map(value=><button role="tab" data-guide={`navigation-tab-${value.value}`} aria-selected={menu===value.value} className={menu===value.value?'active':''} onClick={()=>{setMenu(value.value);setEditing(null);}} key={value.value}>{value.label}<span>{items.filter(item=>item.menu===value.value).length}</span></button>)}</div><label className="nk-admin-inline-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search links" aria-label="Search navigation links"/></label>
      {loading?<div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading navigation…</div>:shown.length?<div className="nk-admin-navigation-list">{shown.map((item,index)=><article className={!item.active?'inactive':''} key={item.id}><span className="nk-admin-drag-index">{String(index+1).padStart(2,'0')}</span><button className="nk-admin-navigation-main" onClick={()=>setEditing({...item})}><b>{item.label}</b><span>{item.url}</span><small>{item.description||'No supporting description'}</small></button><label className="nk-admin-switch"><input type="checkbox" checked={item.active} disabled={!canWrite||busy} onChange={event=>void update(item,{active:event.target.checked})}/><span>{item.active?'Active':'Inactive'}</span></label>{canWrite&&<ActionMenu compact label={`Actions for ${item.label}`}><button role="menuitem" onClick={()=>void move(item,-1)} disabled={busy||index===0}><ArrowUp/>Move up</button><button role="menuitem" onClick={()=>void move(item,1)} disabled={busy||index===shown.length-1}><ArrowDown/>Move down</button><button role="menuitem" onClick={()=>void duplicate(item)} disabled={busy}><Copy/>Duplicate</button>{user?.role==='owner'&&<button role="menuitem" className="danger" onClick={()=>void remove(item)} disabled={busy}><Trash2/>Delete</button>}</ActionMenu>}</article>)}</div>:<EmptyState title="No links in this menu" body={query?'Change the search to see more links.':'Add the first link to this menu.'}/>}</section>
      {editing&&<aside className="nk-admin-side-editor" aria-label={editing.id?'Edit navigation link':'New navigation link'}><header><div><Link2/><span>{editing.id?'EDIT LINK':'NEW LINK'}</span><h2>{editing.label||'Untitled link'}</h2></div><button onClick={()=>setEditing(null)} aria-label="Close navigation editor"><X/></button></header><form onSubmit={save}><label>Menu<select data-guide="navigation-menu" value={editing.menu} disabled={!canWrite} onChange={event=>setEditing({...editing,menu:event.target.value as NavigationMenu})}>{menus.map(value=><option value={value.value} key={value.value}>{value.label}</option>)}</select></label><label>Label<input data-guide="navigation-label" autoFocus required value={editing.label} disabled={!canWrite} onChange={event=>setEditing({...editing,label:event.target.value})}/></label><label>Link<input data-guide="navigation-url" required value={editing.url} disabled={!canWrite} onChange={event=>setEditing({...editing,url:event.target.value})}/></label><label>Description<textarea rows={4} value={editing.description} disabled={!canWrite} onChange={event=>setEditing({...editing,description:event.target.value})}/></label><label className="nk-admin-checkbox"><input type="checkbox" checked={editing.active} disabled={!canWrite} onChange={event=>setEditing({...editing,active:event.target.checked})}/><span>Active and visible</span></label>{canWrite&&<button className="nk-admin-primary" data-guide="save-navigation-link" disabled={busy}><Save/>{busy?'Saving…':'Save link'}</button>}</form></aside>}
    </div>
  </div>;
}
