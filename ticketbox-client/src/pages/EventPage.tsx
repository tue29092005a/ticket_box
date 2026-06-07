import React, { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { useTicketEvents } from '../hooks/useTicketEvents';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';

export const EventPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Bọc API call trong Debounce 300ms
  const fetchSearchResults = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSearchResults([]);
          return;
        }
        try {
          const res = await axiosClient.get(`/search?q=${query}`);
          setSearchResults(res.data);
        } catch (error) {
          console.error('Search failed', error);
        }
      }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    fetchSearchResults(e.target.value);
  };

  const { lastEvent } = useTicketEvents('1');
  const [availableVip, setAvailableVip] = useState(45); // Fake ban đầu

  useEffect(() => {
    if (lastEvent && lastEvent.availableTickets !== undefined) {
      setAvailableVip(lastEvent.availableTickets);
    }
  }, [lastEvent]);

  useEffect(() => {
    // Micro-interaction for the Buy Button
    const buyBtn = document.querySelector('button.bg-primary-container') as HTMLElement;
    if (buyBtn) {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = buyBtn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        buyBtn.style.setProperty('--x', `${x}px`);
        buyBtn.style.setProperty('--y', `${y}px`);
      };
      buyBtn.addEventListener('mousemove', handleMouseMove);
      return () => buyBtn.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  useEffect(() => {
    // Sticky Nav logic
    const handleScroll = () => {
      const nav = document.querySelector('nav');
      if (nav) {
        if (window.scrollY > 20) {
          nav.classList.add('shadow-xl', 'bg-opacity-95');
        } else {
          nav.classList.remove('shadow-xl', 'bg-opacity-95');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden">
      {/* TopNavBar */}
      <nav className="bg-primary-container dark:bg-primary-container docked full-width top-0 z-50 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-margin-desktop py-4 w-full max-w-container-max mx-auto">
          <div className="flex items-center gap-gutter">
            <a href="/" className="text-headline-lg font-headline-lg font-bold text-on-primary-container hover:opacity-80 transition-opacity cursor-pointer inline-block">ticketbox</a>
            <div className="hidden md:flex flex-col relative min-w-[320px]">
              <div className="flex items-center bg-white/20 rounded-lg px-4 py-2 gap-2">
                <span className="material-symbols-outlined text-on-primary-container/70">search</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 text-on-primary-container placeholder:text-on-primary-container/60 w-full font-body-sm" 
                  placeholder="Bạn tìm gì hôm nay?" 
                  type="text" 
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                <button className="bg-white text-on-primary-container px-3 py-1 rounded font-label-md hover:bg-white/90 transition-colors">Tìm kiếm</button>
              </div>
              {/* Typeahead Suggestions */}
              {searchResults.length > 0 && (
                <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                  {searchResults.map((show, idx) => (
                    <div key={idx} className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                        <img src={show.thumbnail} alt={show.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-black font-body-sm font-semibold">{show.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden lg:flex items-center gap-6">
              <a className="text-on-primary-container/80 font-label-md hover:text-white transition-colors" href="#">Tạo sự kiện</a>
              <a className="text-on-primary-container/80 font-label-md hover:text-white transition-colors" href="#">Vé của tôi</a>
            </div>
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
              <div 
                className="flex items-center gap-2 text-on-primary-container/80 font-label-md cursor-pointer hover:text-white transition-colors"
                onClick={() => setIsLoginModalOpen(true)}
              >
                <span className="material-symbols-outlined text-[24px]">account_circle</span>
                <span className="hidden sm:block">Đăng nhập</span>
                <span className="material-symbols-outlined text-[16px] hidden sm:block">expand_more</span>
              </div>
            )}
            <span className="material-symbols-outlined text-on-primary-container cursor-pointer hidden md:block">language</span>
          </div>
        </div>
      </nav>
      {/* Sub Navigation */}
      <div className="bg-surface-container-low border-b border-outline-variant hidden md:block">
        <div className="max-w-container-max mx-auto px-margin-desktop py-3 flex gap-8">
          <a className="text-on-primary-container font-bold border-b-2 border-on-primary-container pb-1 font-label-md" href="#">Nhạc sống</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Sân khấu &amp; Nghệ thuật</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Thể thao</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Hội thảo &amp; Workshop</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Tham quan &amp; Trải nghiệm</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Khác</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Vé bán lại</a>
          <a className="text-on-surface-variant font-label-md hover:text-primary transition-colors" href="#">Blog</a>
        </div>
      </div>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-margin-desktop space-y-margin-desktop">
        {/* Hero Section: Event Ticket Card */}
        <section className="relative group">
          <div className="flex flex-col md:flex-row bg-surface-container-high rounded-xl overflow-hidden shadow-2xl relative">
            {/* Ticket Content (Left) */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-between relative">
              <div className="space-y-6">
                <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight">[Dốc Mộng Mơ] Starlight - Quốc Thiên</h1>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span className="font-body-md">19:30 - 22:00, 06 Tháng 06, 2025</span>
                  </div>
                  <div className="flex items-start gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined">location_on</span>
                    <div>
                      <p className="font-headline-md text-primary">Trung Tâm Nghệ Thuật Âu Cơ</p>
                      <p className="font-body-sm">8 Huỳnh Thúc Kháng, Phường Giảng Võ, Thành phố Hà Nội</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-outline-variant flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-on-surface-variant">Giá từ</p>
                    <p className="font-headline-md text-primary-container">1.050.000 đ</p>
                  </div>
                  <span className="material-symbols-outlined text-primary-container text-3xl">chevron_right</span>
                </div>
                <button onClick={() => window.location.href='/seat.html'} className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 relative overflow-hidden">
                  Mua vé ngay
                </button>
              </div>
              {/* Stub Divider */}
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-dashed bg-outline-variant opacity-30"></div>
            </div>
            {/* Poster Image (Right) */}
            <div className="w-full md:w-1/2 h-[400px] md:h-auto relative">
              <img alt="Starlight event poster" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABvAGlSse2Xau-2J8KDcHYWpxl46eIzBU6V9Ek1rf41fU1cH07dl7qPt6rMAyKGpEjyspkOZMw9C_Y6f18Sx4zU_ZkUBFWwl410uJ5ai2Qg7WTNb5AkmApYEaN6R_PtcLEE2Mkf-IbqdJEZ198gUzvaVZHfDGH7-oCvhVkyDdKdW3qiFCc82qHsVN9yWcEBXLap0pJTEjEpbzBXT3ZLfQ1PMoGfa-YuCGMSXBxhTTvc_glH-ip0yCIipasrLKv17neupyz7iONm4k-" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-surface-container-high/60"></div>
              {/* Brand floating tag */}
              <div className="absolute top-6 right-6 glass-effect px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-md text-on-surface">HOT EVENT</span>
              </div>
            </div>
            {/* Ticket Notches */}
            <div className="hidden md:block absolute left-1/2 -ml-3 -top-3 w-6 h-6 bg-background rounded-full"></div>
            <div className="hidden md:block absolute left-1/2 -ml-3 -bottom-3 w-6 h-6 bg-background rounded-full"></div>
          </div>
        </section>
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Description & Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Tabs for Content */}
            <div className="flex border-b border-outline-variant">
              <button className="px-6 py-3 text-primary border-b-2 border-primary font-headline-md">Giới thiệu</button>
              <button className="px-6 py-3 text-on-surface-variant hover:text-on-surface transition-colors font-label-md">Quy định</button>
              <button className="px-6 py-3 text-on-surface-variant hover:text-on-surface transition-colors font-label-md">Sơ đồ ghế</button>
            </div>
            <div className="bg-surface-container-high rounded-xl p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-error font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">warning</span>
                  Lưu ý: Số ghế sẽ được BTC gửi sau khi khách hàng thanh toán đơn hàng thành công trên Ticketbox.
                </p>
                <div className="space-y-4 text-on-surface-variant font-body-md leading-relaxed">
                  <h3 className="text-on-surface font-headline-md">✨ STARLIGHT – MÓN QUÀ TỪ DỐC MỘNG MƠ DÀNH RIÊNG CHO CÁC “DÒNG MÂY” ✨</h3>
                  <p className="">Dốc Mộng Mơ dành tặng một món quà sinh nhật ý nghĩa nhất tới ca sĩ Quốc Thiên và đại gia đình nhà Mây - Một cuộc hẹn đặc biệt mang tên Starlight – đêm nhạc thay lời cảm ơn chân thành sẽ diễn ra vào tháng 6 này tại Hà Nội.</p>
                  <p className="">Giữa không gian nghệ thuật ấm cúng, hãy để những bản tình ca da diết “vỗ về” tâm hồn của các khán giả thân yêu nhà Dốc. Đừng bỏ lỡ cơ hội tuyệt vời này để cùng Quốc Thiên chìm đắm trong không gian âm nhạc tràn ngập cảm xúc và những điều bất ngờ.</p>
                  <ul className="space-y-3 list-none">
                    <li className="flex gap-3">
                      <span className="text-primary-container">●</span>
                      <span className="">Thời gian: 19:30 - 22:00, Thứ sáu 06/06/2025</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-primary-container">●</span>
                      <span className="">Địa điểm: Trung Tâm Nghệ Thuật Âu Cơ, Hà Nội</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-primary-container">●</span>
                      <span className="">Nghệ sĩ: Ca sĩ Quốc Thiên và ban nhạc</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Map Section */}
            <section className="bg-surface-container-high rounded-xl p-6 md:p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-primary font-headline-md">Lịch diễn</h2>
                <div className="flex bg-surface-container-low rounded-lg p-1">
                  <button className="bg-white text-surface p-1.5 rounded-md">
                    <span className="material-symbols-outlined text-[20px]">list</span>
                  </button>
                  <button className="text-on-surface-variant p-1.5">
                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  </button>
                </div>
              </div>
              <div className="bg-surface-container-lowest/50 rounded-xl p-6 border border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                  <div>
                    <p className="font-body-md text-on-surface">19:30 - 22:00, T7</p>
                    <p className="font-label-md text-primary">06 Tháng 06, 2026</p>
                  </div>
                </div>
                <button onClick={() => window.location.href='/seat.html'} className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-headline-md hover:brightness-110">
                  Mua vé ngay
                </button>
              </div>
              <div className="space-y-6">
                <h3 className="text-on-surface font-headline-md">Thông tin vé</h3>
                <div className="space-y-3">
                  <div className="bg-surface-container-lowest/30 p-4 rounded-xl border border-outline-variant flex justify-between items-center">
                    <span className="font-bold text-on-surface">SVIP</span>
                    <div className="text-right">
                      <p className="text-primary font-bold">2.650.000 đ</p>
                      <span className="inline-block bg-error/20 text-error text-[10px] px-2 py-0.5 rounded uppercase font-bold mt-1">Hết vé</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest/30 p-4 rounded-xl border border-outline-variant flex justify-between items-center">
                    <span className="font-bold text-on-surface">VIP</span>
                    <div className="text-right">
                      <p className="text-primary font-bold">2.450.000 đ</p>
                      <span className="inline-block bg-error/20 text-error text-[10px] px-2 py-0.5 rounded uppercase font-bold mt-1">Hết vé</span>
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-lowest/30 p-4 rounded-xl border border-outline-variant flex justify-between items-center">
                    <span className="font-bold text-on-surface">Normal</span>
                    <p className="text-primary font-bold">1.850.000 đ</p>
                  </div>
                  
                  
                  
                </div>
              </div>
            </section>
          </div>
          {/* Right Sidebar: Promo & Summary */}
          <div className="lg:col-span-4 space-y-gutter">
            {/* Promo Card */}
            {/* Event Stats */}
            <div className="bg-surface-container-high rounded-xl p-6 space-y-6">
              <h4 className="font-label-md uppercase tracking-wider text-on-surface-variant">Thông tin bổ sung</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface">Đang quan tâm</p>
                    <p className="font-body-sm text-on-surface-variant">1,200+ người</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">confirmation_number</span>
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface">Vé còn lại</p>
                    <p className="font-body-sm text-on-surface-variant">Chỉ còn {availableVip} vé VIP</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Social Share */}
            <div className="flex justify-center gap-4">
              <button className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">share</span>
              </button>
              <button className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">favorite</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FAB for quick booking (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button className="bg-primary-container text-on-primary-container w-16 h-16 rounded-full shadow-2xl flex items-center justify-center active:scale-95 duration-200">
          <span className="material-symbols-outlined text-3xl">confirmation_number</span>
        </button>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};
