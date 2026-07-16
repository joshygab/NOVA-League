import { ImageIcon } from 'lucide-react'
import { useState } from 'react'
import PageTitle from '../components/PageTitle'

export default function NewsPage({ league }) {
  const [category, setCategory] = useState('')
  const categories = ['noticia', 'previa', 'cronica', 'fichaje', 'sancion', 'comunicado']
  const news = category ? league.news.filter((item) => (item.category || 'noticia') === category) : league.news
  const notifications = (league.notifications || []).filter((item) => item.status === 'published').slice(0, 6)
  return (
    <>
      <PageTitle kicker="NOVA Media" title="Noticias, comunicados y galería" />
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button className={category === '' ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'} onClick={() => setCategory('')}>Todo</button>
        {categories.map((item) => <button key={item} className={category === item ? 'button whitespace-nowrap' : 'button-secondary whitespace-nowrap'} onClick={() => setCategory(item)}>{label(item)}</button>)}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-4">
          {news.map((item) => (
            <article key={item.id} className="panel overflow-hidden">
              {item.cover_url && <img src={item.cover_url} alt={item.title} className="h-64 w-full object-cover" />}
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{label(item.category || 'noticia')} · {new Date(item.published_at).toLocaleDateString('es-MX')}</p>
                <h2 className="mt-2 text-2xl font-black">{item.title}</h2>
                <p className="mt-3 text-slate-300">{item.excerpt}</p>
              </div>
            </article>
          ))}
          {news.length === 0 && <p className="panel p-5 text-sm text-slate-400">No hay publicaciones en esta categoría.</p>}
        </section>
        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Avisos oficiales</h2>
            <div className="space-y-3">
              {notifications.map((item) => <div key={item.id} className="rounded-lg border border-gold/20 bg-gold/10 p-3"><p className="font-black text-gold">{item.title}</p><p className="mt-1 text-sm text-slate-300">{item.body}</p></div>)}
              {notifications.length === 0 && <p className="text-sm text-slate-400">Sin avisos publicados.</p>}
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-xl font-black">Galería</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {league.gallery.map((item) => (
                <div key={item.id} className="panel grid aspect-square place-items-center overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" /> : <ImageIcon className="text-slate-500" size={42} />}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

function label(value) {
  const labels = { noticia: 'Noticia', previa: 'Previa', cronica: 'Crónica', fichaje: 'Fichaje', sancion: 'Sanción', comunicado: 'Comunicado' }
  return labels[value] || value
}
