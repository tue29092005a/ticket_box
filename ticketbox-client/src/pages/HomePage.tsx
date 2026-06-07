import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';
export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await axiosClient.get('/info/shows');
        setShows(res.data);
      } catch (error) {
        console.error('Failed to fetch shows:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, []);

  // Lọc ra các slide ảnh cho carousel (lấy tối đa 4 shows đầu tiên có ảnh)
  const carouselShows = shows.filter(s => s.coverImage).slice(0, 4);
  const slides = carouselShows.length > 0 ? carouselShows.map(s => s.coverImage) : [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCbOgf9Dk-adYciUen0WEB_c4KNMIBQg85blTW8D0sNeVyQhhXKlkQdNrXuilhnUM4A8WhwxxuKl3QPQX2Sjiyw5gaURQoxlgWX4m4J-tv9HppzWsqXPJcgH2i4iPTL4jDyn1QGmh26c1MMD15JLghsHCajcSkqy8xQ6n2oZV5El73JeiVsnNQNDLRQaL3t7DzNLKgDf7rtkoMhzK_tgP8EFMjF709U0hfXcbnDORQmYVb-_Bb24QZdrUhYLoFYbSWu47c7z3z4THO3"
  ];

  // Component Skeleton khi Loading
  const SkeletonCard = () => (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="aspect-[3/4] bg-surface-container-low rounded-xl"></div>
      <div className="h-6 bg-surface-container-low rounded w-3/4"></div>
      <div className="h-4 bg-surface-container-low rounded w-1/2"></div>
    </div>
  );

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
            <a href="/" className="text-headline-lg font-headline-lg font-bold text-on-primary-container tracking-tight hover:opacity-80 transition-opacity cursor-pointer inline-block">ticketbox</a>
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
              {user ? (
                <div className="flex items-center gap-3 bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-sm font-medium text-white hidden sm:block">{user.email}</span>
                  <span className="text-sm font-medium text-white sm:hidden">{user.email.split('@')[0]}</span>
                  <button
                    onClick={logout}
                    className="text-xs text-on-primary-container/80 hover:text-red-400 transition-colors font-label-md"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-on-primary-fixed text-primary px-6 py-2 rounded-full font-bold hover:bg-white transition-colors"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>


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
                src={slides[currentSlide] || ''}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-surface-container-low/20"></div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (carouselShows[currentSlide]) {
                    navigate(`/event.html?id=${carouselShows[currentSlide].id}`);
                  }
                }}
                className="absolute bottom-6 left-6 bg-primary text-on-primary px-6 py-2 rounded-full font-bold shadow-lg hover:brightness-110 transition-all z-10"
              >
                Xem chi tiết
              </button>

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

        {/* Top Music Shows Section */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline-lg text-headline-lg text-white">Upcoming Events</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : shows.map((show) => (
              <div key={show.id} className="flex flex-col gap-4 group cursor-pointer" onClick={() => navigate(`/event.html?id=${show.id}`)}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-container-low">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={show.name}
                    src={show.coverImage || slides[0]}
                  />

                </div>
                <div>
                  <h5 className="font-headline-md text-headline-md text-white group-hover:text-primary transition-colors line-clamp-1">{show.name}</h5>
                  <p className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1 mt-1 line-clamp-1">
                    <span className="material-symbols-outlined text-[18px]">location_on</span> {show.location}
                  </p>
                  <div className="flex items-center justify-end mt-4">
                    <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_outward</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>



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

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
