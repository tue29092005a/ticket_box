import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCbOgf9Dk-adYciUen0WEB_c4KNMIBQg85blTW8D0sNeVyQhhXKlkQdNrXuilhnUM4A8WhwxxuKl3QPQX2Sjiyw5gaURQoxlgWX4m4J-tv9HppzWsqXPJcgH2i4iPTL4jDyn1QGmh26c1MMD15JLghsHCajcSkqy8xQ6n2oZV5El73JeiVsnNQNDLRQaL3t7DzNLKgDf7rtkoMhzK_tgP8EFMjF709U0hfXcbnDORQmYVb-_Bb24QZdrUhYLoFYbSWu47c7z3z4THO3",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD8MdEbV0frFQ0aUda3LPIZoCnoqzhBMvmWD98rbMKXvOwDQe3pTMC4nDpABZ5roTCvYwoe5uftLPC7_TaIOIFEQLScUn1fn4B8T03oJWqir5Y4EAUfts1eS2fnWeVqxtYm2z_RHWTK5A7Vm53sOkycXQhf4iQRRsT9dgj8hz6Ev7eWe7x-_EMCcQo_7DVDwxazTtds9IV9jDkg7KynE5CQEClt3PbcDutBIDcUkqo6c_52J37uBrqp2c4RqDVSoGlcPE8NjCUSKBY2",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBEZKKpYQbiNBJYhiH3k1geASGn5o9pd03RJpHTt72LA6N7VH7j1GTD2WZYHhZmqkblmQ1QFnlXBX6uPHXFeuxaMn6sYNtv35-RIG4PuwpzTg67JaqVUE-a8qWNUm7GJQl5lxSKPIgzIntWCWqbsCwSf4wEPaFiofmfJl41i1MKy_Mp8fbDVEz_BoiRZp78TbSLq0FngADVCBCgKG034Hn68-u_KHOBNblt3y1t4G9DO0A3ef7Zb6aaiezvW8bL0c3cnn8VK8-aYuny",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB7gDyTHYewdMbCjGRXDVPmv7s2gU4SROjZhayhwiHRatxdbnup98H8pqcWabKLxa_el04xnj_sQ46GE4D7Z-DItP_iPRAgiYGr2HOigmvN6Icz1vDSpy0HeQ-5RmJ7fGWLbdlDgG63Y5_4HOsgmBVabYU5c2Htw_teDimKHL1nLy4VAZbmF-gyIfZm9S7-k7ydwe42y-jcotgoJ9z7KqT7LMQf-iPDioXa6YNYWAV7eYHy8ABIU-nd2ru5svEd9Re_cV8gnyzVqSvp"
  ];

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="font-body-md text-body-md overflow-x-hidden bg-black text-[#e5e2e1] min-h-screen pb-16">
      {/* TopNavBar */}
      <header className="bg-primary-container dark:bg-primary-container text-on-primary-container docked full-width top-0 shadow-sm z-50 sticky transition-all">
        <div className="flex justify-between items-center px-margin-desktop py-4 w-full max-w-container-max mx-auto">
          <div className="flex items-center gap-gutter">
            <h1 className="text-headline-lg font-headline-lg font-bold text-on-primary-container tracking-tight">ticketbox</h1>
            <div className="hidden md:flex relative group">
              <input
                className="bg-on-primary-fixed-variant/20 border-none rounded-full py-2 pl-10 pr-4 text-on-primary-container placeholder-on-primary-container/60 w-80 focus:ring-2 focus:ring-on-primary-container transition-all"
                placeholder="Search events, artists, venues..."
                type="text"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-primary-container/70">search</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-on-primary-container font-bold border-b-2 border-on-primary-container pb-1 font-label-md text-label-md" href="#">Home</a>
            <a className="text-on-primary-container/80 font-label-md text-label-md hover:text-white transition-colors" href="#">Create Event</a>
            <a className="text-on-primary-container/80 font-label-md text-label-md hover:text-white transition-colors" href="#">My Tickets</a>
            <div className="flex items-center gap-4 ml-4">
              <button className="flex items-center gap-1 text-on-primary-container hover:scale-95 duration-200">
                <span className="material-symbols-outlined">language</span>
              </button>
              <button className="bg-on-primary-fixed text-primary px-6 py-2 rounded-full font-bold hover:bg-white transition-colors">Account</button>
            </div>
          </nav>
        </div>
      </header>

      {/* Category Strip */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-[72px] z-40 hidden md:block">
        <div className="max-w-container-max mx-auto px-margin-desktop flex items-center justify-between py-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <div className="flex gap-8">
            <a className="font-label-md text-label-md text-primary flex items-center gap-2" href="#">Music</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Theater</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Sports</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Workshops</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Exhibitions</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#">Festivals</a>
          </div>
          <div className="flex items-center gap-4 text-primary text-label-md font-label-md">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">sell</span> Resell Tickets</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">article</span> Blog</span>
          </div>
        </div>
      </div>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8">
        {/* Hero Featured Carousel (Starlight Inspired) */}
        <section className="mb-20">
          <div className="relative group overflow-hidden rounded-xl bg-surface-container-low shadow-2xl flex flex-col md:flex-row h-auto md:h-[480px] cursor-pointer" onClick={() => navigate('/event.html')}>
            {/* Right Visual Side */}
            <div className="flex-1 relative overflow-hidden bg-surface-container-high h-[300px] md:h-full">
              <img
                key={currentSlide}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-cover animate-fade-in"
                src={slides[currentSlide]}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-surface-container-low/20"></div>

              {/* Carousel Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          {/* Indicators */}
          <div className="flex justify-center items-center gap-3 mt-8">
            {slides.map((_, index) => (
              <span
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1 rounded-full cursor-pointer transition-all duration-300 ${index === currentSlide ? 'w-12 bg-primary' : 'w-2 bg-outline-variant hover:bg-primary/50'}`}
              ></span>
            ))}
          </div>
        </section>

        {/* Category Headers Shared Style */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline-lg text-headline-lg text-white">Top Music Shows</h3>
        </div>

        {/* Bento Grid / Asymmetric Layout for Upcoming */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-20">
          {/* Large Feature Card */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-xl bg-surface-container-high h-[500px] cursor-pointer" onClick={() => navigate('/event.html')}>
            <img
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              alt="A high-energy electronic dance music festival"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8MdEbV0frFQ0aUda3LPIZoCnoqzhBMvmWD98rbMKXvOwDQe3pTMC4nDpABZ5roTCvYwoe5uftLPC7_TaIOIFEQLScUn1fn4B8T03oJWqir5Y4EAUfts1eS2fnWeVqxtYm2z_RHWTK5A7Vm53sOkycXQhf4iQRRsT9dgj8hz6Ev7eWe7x-_EMCcQo_7DVDwxazTtds9IV9jDkg7KynE5CQEClt3PbcDutBIDcUkqo6c_52J37uBrqp2c4RqDVSoGlcPE8NjCUSKBY2"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-10 flex flex-col justify-end">
              <div className="inline-block bg-primary text-on-primary-container px-3 py-1 rounded-md font-label-md text-label-md mb-4 w-fit">EARLY BIRD OPEN</div>
              <h4 className="font-headline-lg text-headline-lg text-white mb-2">NEON DREAMS FESTIVAL 2024</h4>
              <p className="text-on-surface-variant font-body-md text-body-md mb-6 max-w-lg">The world's largest immersive digital music experience returns to Hanoi for one night only.</p>
              <div className="flex items-center gap-12 text-white border-t border-white/20 pt-6">
                <div>
                  <p className="text-label-md font-label-md opacity-60 uppercase mb-1">Date</p>
                  <p className="font-headline-md text-headline-md">OCT 24</p>
                </div>
                <div>
                  <p className="text-label-md font-label-md opacity-60 uppercase mb-1">Venue</p>
                  <p className="font-headline-md text-headline-md">My Dinh Stadium</p>
                </div>
                <button className="bg-white text-black font-bold px-8 py-3 rounded-lg ml-auto hover:bg-primary hover:text-white transition-colors">Book Tickets</button>
              </div>
            </div>
          </div>
          {/* Side Secondary Cards */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            <div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container-high min-h-[238px] cursor-pointer" onClick={() => navigate('/event.html')}>
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="Close-up of a jazz saxophone player"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEZKKpYQbiNBJYhiH3k1geASGn5o9pd03RJpHTt72LA6N7VH7j1GTD2WZYHhZmqkblmQ1QFnlXBX6uPHXFeuxaMn6sYNtv35-RIG4PuwpzTg67JaqVUE-a8qWNUm7GJQl5lxSKPIgzIntWCWqbsCwSf4wEPaFiofmfJl41i1MKy_Mp8fbDVEz_BoiRZp78TbSLq0FngADVCBCgKG034Hn68-u_KHOBNblt3y1t4G9DO0A3ef7Zb6aaiezvW8bL0c3cnn8VK8-aYuny"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
                <h4 className="font-headline-md text-headline-md text-white">Midnight Jazz Session</h4>
                <p className="text-primary font-body-sm text-body-sm">Starts from 450k đ</p>
              </div>
            </div>
            <div className="flex-1 group relative overflow-hidden rounded-xl bg-surface-container-high min-h-[238px] cursor-pointer" onClick={() => navigate('/event.html')}>
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt="A modern theatrical performance on a professional stage"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDolEjM-rP8Bm_hkznGvlb-IP-3_fihI72u0dguqe23Lx49SLlAuV33X3shZZgBVPonQkgBdSWw3CYVeUK5QULt91bn7xOkDNm5JPIfKiKlFpPhtupC3djBWCPA5NHQ5FjxHpG9qs9Ul3fe_OrJtHxaeDsLq4-sftvkStQZ3hNKpFTEha9FitmV2T5pY8LszZVc-lJuBTP4PSXNP07jWsyaawSSQOKpCFVWqPggV9sYeqNAer9Qaly04xU75ICAsZc-s-xUgR6_53gD"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
                <h4 className="font-headline-md text-headline-md text-white">The Modern Hamlet</h4>
                <p className="text-primary font-body-sm text-body-sm">Final Call - 80% Sold</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top Music Shows Section */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline-lg text-headline-lg text-white">Upcoming Events</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
            {/* Card 1 */}
            <div className="flex flex-col gap-4 group cursor-pointer" onClick={() => navigate('/event.html')}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt="Vibrant pop concert stage"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7gDyTHYewdMbCjGRXDVPmv7s2gU4SROjZhayhwiHRatxdbnup98H8pqcWabKLxa_el04xnj_sQ46GE4D7Z-DItP_iPRAgiYGr2HOigmvN6Icz1vDSpy0HeQ-5RmJ7fGWLbdlDgG63Y5_4HOsgmBVabYU5c2Htw_teDimKHL1nLy4VAZbmF-gyIfZm9S7-k7ydwe42y-jcotgoJ9z7KqT7LMQf-iPDioXa6YNYWAV7eYHy8ABIU-nd2ru5svEd9Re_cV8gnyzVqSvp"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg font-label-md text-label-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.9
                </div>
              </div>
              <div>
                <h5 className="font-headline-md text-headline-md text-white group-hover:text-primary transition-colors line-clamp-1">V-Pop Summer Wave</h5>
                <p className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span> Ho Chi Minh City
                </p>
                <div className="flex items-center justify-between mt-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">From <span className="text-white font-bold">500k đ</span></p>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_outward</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col gap-4 group cursor-pointer" onClick={() => navigate('/event.html')}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt="Classical orchestra performing"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQVxttJj6MqNwMQlRGY7VcEsOiXe7ZHaOs2GbnTDc2au8vD9WL2lnCBljpcDyWfJu2oxzmJCvuyVaO1WWPysZUIyxXhWRkokEffljVQNeEFHR7XWqt9Gata-qDFq-hYc28VCvBH2jnJNp0LjKRlQx21xaIv6ZbHkx6_oxh4BGRkMDcIKO99Vf_IzLjVqo6HjST5o8z43HtKVtLbVnPIQ2jhRDg8vZcDrgnxXM1VbNyVGj3M9Jy8c_2GkOmZIRnLtjHCdPv3_GEQXpe"
                />
              </div>
              <div>
                <h5 className="font-headline-md text-headline-md text-white group-hover:text-primary transition-colors line-clamp-1">Philharmonic Series</h5>
                <p className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span> Hanoi Opera House
                </p>
                <div className="flex items-center justify-between mt-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">From <span className="text-white font-bold">850k đ</span></p>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_outward</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col gap-4 group cursor-pointer" onClick={() => navigate('/event.html')}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt="Outdoor summer music festival at sunset"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5xgwBDZxBfJSCwvwr1f46lXh_5fTlnLixKPXhd1xGyqeuXD6JqHFZl7rp0LA_g4kpcOW64qY5TGdXF_z_9OBPUetxPT5dPQuROr3xjDnfwQxiFWOlOhgB5y1h1wU1xRaP44PwwXJ2b80FOLl7YBRSds_XN5ac0w7BPee2SfEbTNntdlwxaARCNRDlQrKbAlg3YV5qAi2j6RxAdlF35ZyvY_tjpRZLkbBh1pn-xES06JZEioAbSLYoD8seHDE9f9nXbneppJT-rcga"
                />
              </div>
              <div>
                <h5 className="font-headline-md text-headline-md text-white group-hover:text-primary transition-colors line-clamp-1">Sunset Indie Festival</h5>
                <p className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span> Da Nang
                </p>
                <div className="flex items-center justify-between mt-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">From <span className="text-white font-bold">350k đ</span></p>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_outward</span>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col gap-4 group cursor-pointer" onClick={() => navigate('/event.html')}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt="Close up of a electric guitar player performing"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFIgo6jhlkCgrOu7wj3Mt1x3nWgsuwoMcL7eWr_y-NEDgtIYrmIRlfMVZMnH21ARPWisyy7lAUFOZWinFiVCgav33_mEqco0zSdofaKRDkLw4Y7BBfNUi6J8Azk3VdJ4WKEkq2EvCPimKov0QLYcONXxun2awFM1LiRWhUajxcmaGmOkHmK5jFqUgutSC_BUIMtcFkJ91YJ_EaN-_ipBxq_WfTyUvpNX6COqx71vEbLAqoB0e4FS7uQK0qxWoIrTfpLk8fKqZ9lycD"
                />
              </div>
              <div>
                <h5 className="font-headline-md text-headline-md text-white group-hover:text-primary transition-colors line-clamp-1">Rock Legends Tribute</h5>
                <p className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span> Hanoi
                </p>
                <div className="flex items-center justify-between mt-4">
                  <p className="font-label-md text-label-md text-on-surface-variant">From <span className="text-white font-bold">600k đ</span></p>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_outward</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest text-on-surface-variant full-width mt-margin-desktop border-t border-outline-variant/30">
        <div className="grid grid-cols-1 md:grid-cols-4 px-margin-desktop py-12 max-w-container-max mx-auto gap-12">
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-headline-md font-headline-md text-primary mb-6">ticketbox</h2>
            <p className="font-body-sm text-body-sm mb-6 leading-relaxed">The leading event ticketing platform in Vietnam, connecting people to the most exciting live entertainment experiences.</p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:text-primary hover:border-primary transition-all" href="#">FB</a>
              <a className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:text-primary hover:border-primary transition-all" href="#">IG</a>
              <a className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:text-primary hover:border-primary transition-all" href="#">YT</a>
            </div>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-white uppercase mb-6 tracking-widest">Explore</h4>
            <ul className="space-y-4">
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Music Shows</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Theater &amp; Arts</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Sports Events</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Creative Workshops</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-white uppercase mb-6 tracking-widest">Information</h4>
            <ul className="space-y-4">
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">How it works</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Resell Ticket Guide</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Partner with us</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Help Center</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-white uppercase mb-6 tracking-widest">Legal</h4>
            <ul className="space-y-4">
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Terms of Service</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Privacy Policy</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Cookie Policy</a></li>
              <li><a className="font-body-sm text-body-sm hover:text-primary hover:underline transition-all" href="#">Safety &amp; Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-outline-variant/10 py-8 px-margin-desktop max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body-sm text-body-sm opacity-60">© 2024 Ticketbox. All rights reserved.</p>
        </div>
      </footer>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-highest/90 backdrop-blur-xl border-t border-outline-variant/30 flex justify-around items-center py-3 z-50">
        <a className="flex flex-col items-center gap-1 text-primary" href="#">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[10px] font-bold">Home</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[10px] font-bold">Explore</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">confirmation_number</span>
          <span className="text-[10px] font-bold">Tickets</span>
        </a>
        <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold">Profile</span>
        </a>
      </nav>
    </div>
  );
};
