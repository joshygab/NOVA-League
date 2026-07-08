import { ImageIcon } from 'lucide-react'
import PageTitle from '../components/PageTitle'

export default function NewsPage({ league }) {
  return (
    <>
      <PageTitle kicker="Comunidad" title="Noticias y galería" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-4">
          {league.news.map((item) => (
            <article key={item.id} className="panel overflow-hidden">
              {item.cover_url && <img src={item.cover_url} alt={item.title} className="h-64 w-full object-cover" />}
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{new Date(item.published_at).toLocaleDateString('es-MX')}</p>
                <h2 className="mt-2 text-2xl font-black">{item.title}</h2>
                <p className="mt-3 text-slate-300">{item.excerpt}</p>
              </div>
            </article>
          ))}
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
      </div>
    </>
  )
}
