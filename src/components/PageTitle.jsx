export default function PageTitle({ kicker, title, children }) {
  return (
    <section className="mb-6">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-gold">{kicker}</p>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <h1 className="max-w-3xl text-3xl font-black tracking-normal text-white md:text-5xl">{title}</h1>
        {children && <div>{children}</div>}
      </div>
    </section>
  )
}
