import React, { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';

import { useSearchParams } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';

export const EventPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id') || '1';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/info/show/${eventId}`);
        setEventData(res.data);
      } catch (err: any) {
        console.error('Failed to fetch event details:', err);
        if (err.response?.status === 502) {
          setError(err.response.data?.message || 'Hệ thống tải dữ liệu sự kiện đang nâng cấp. Vui lòng quay lại sau ít phút.');
        } else {
          setError('Đã có lỗi xảy ra khi tải dữ liệu sự kiện.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    // Reset timer khi quay lại trang chi tiết sự kiện
    sessionStorage.removeItem('booking_expireAt');
  }, []);

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

          </div>
        </div>
      </nav>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-margin-desktop space-y-margin-desktop">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-fade-in bg-surface-container-high rounded-xl shadow-2xl">
            <span className="material-symbols-outlined text-[80px] text-on-surface-variant/50 mb-6">conveyor_belt</span>
            <h3 className="font-headline-md text-on-surface mb-2">Thông tin không khả dụng</h3>
            <p className="font-body-md text-on-surface-variant max-w-md">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-8 bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold hover:bg-white transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Hero Section: Event Ticket Card */}
            <section className="relative group">
          {loading ? (
            <div className="flex flex-col md:flex-row bg-surface-container-high rounded-xl h-[400px] animate-pulse"></div>
          ) : (
            <div className="flex flex-col md:flex-row bg-surface-container-high rounded-xl overflow-hidden shadow-2xl relative">
              {/* Ticket Content (Left) */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-between relative">
                <div className="space-y-6">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight">{eventData?.name}</h1>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-primary">
                      <span className="material-symbols-outlined">calendar_today</span>
                      <span className="font-body-md">{eventData?.performanceDate ? new Date(eventData.performanceDate).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    <div className="flex items-start gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined">location_on</span>
                      <div>
                        <p className="font-headline-md text-primary">{eventData?.location?.split(',')[0]}</p>
                        {eventData?.location?.includes(',') && (
                          <p className="font-body-sm">{eventData.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-outline-variant flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-label-md text-on-surface-variant">Trạng thái</p>
                      <p className="font-headline-md text-primary-container">{eventData?.status || 'ON_SALE'}</p>
                    </div>
                  </div>
                  <button onClick={() => window.location.href = `/seat.html?id=${eventId}`} className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 relative overflow-hidden">
                    Mua vé ngay
                  </button>
                </div>
                {/* Stub Divider */}
                <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-dashed bg-outline-variant opacity-30"></div>
              </div>
              {/* Poster Image (Right) */}
              <div className="w-full md:w-1/2 h-[400px] md:h-auto relative">
                <img alt="Event poster" className="w-full h-full object-cover" src={eventData?.coverImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuABvAGlSse2Xau-2J8KDcHYWpxl46eIzBU6V9Ek1rf41fU1cH07dl7qPt6rMAyKGpEjyspkOZMw9C_Y6f18Sx4zU_ZkUBFWwl410uJ5ai2Qg7WTNb5AkmApYEaN6R_PtcLEE2Mkf-IbqdJEZ198gUzvaVZHfDGH7-oCvhVkyDdKdW3qiFCc82qHsVN9yWcEBXLap0pJTEjEpbzBXT3ZLfQ1PMoGfa-YuCGMSXBxhTTvc_glH-ip0yCIipasrLKv17neupyz7iONm4k-"} />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-surface-container-high/60"></div>

              </div>
              {/* Ticket Notches */}
              <div className="hidden md:block absolute left-1/2 -ml-3 -top-3 w-6 h-6 bg-background rounded-full"></div>
              <div className="hidden md:block absolute left-1/2 -ml-3 -bottom-3 w-6 h-6 bg-background rounded-full"></div>
            </div>
          )}
        </section>
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Description & Details */}
          <div className="lg:col-span-8 space-y-8">

            <div className="bg-surface-container-high rounded-xl p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-4 text-on-surface-variant font-body-md leading-relaxed whitespace-pre-line">
                  {loading ? (
                    <div className="h-24 bg-surface-container-low animate-pulse rounded"></div>
                  ) : (
                    <p>{eventData?.description}</p>
                  )}

                  {eventData?.artistBio && (
                    <div className="mt-8">
                      <h3 className="text-on-surface font-headline-md mb-2">Nghệ sĩ tham gia</h3>
                      <p>{eventData?.artistBio}</p>
                    </div>
                  )}

                  {eventData?.rules && (
                    <div className="mt-8">
                      <h3 className="text-on-surface font-headline-md mb-2">Quy định sự kiện</h3>
                      <p className="text-error font-bold flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined">warning</span>
                        Lưu ý từ BTC:
                      </p>
                      <p>{eventData?.rules}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Map Section */}
            <section className="bg-surface-container-high rounded-xl p-6 md:p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-primary font-headline-md">Lịch diễn</h2>

              </div>
              <div className="bg-surface-container-lowest/50 rounded-xl p-6 border border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-body-md text-on-surface">19:30 - 22:00, T7</p>
                    <p className="font-label-md text-primary">06 Tháng 06, 2026</p>
                  </div>
                </div>
                <button onClick={() => window.location.href = '/seat.html'} className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-headline-md hover:brightness-110">
                  Mua vé ngay
                </button>
              </div>
              <div className="space-y-6">
                <h3 className="text-on-surface font-headline-md">Thông tin vé</h3>
                <div className="space-y-3">
                  {loading ? (
                    <div className="h-16 bg-surface-container-low animate-pulse rounded-xl"></div>
                  ) : eventData?.zones && eventData.zones.length > 0 ? (
                    eventData.zones.map((zone: any, idx: number) => (
                      <div key={idx} className="bg-surface-container-lowest/30 p-4 rounded-xl border border-outline-variant flex justify-between items-center">
                        <div>
                          <span className="font-bold text-on-surface" style={{ color: zone.color }}>{zone.zone}</span>
                          {zone.benefits && zone.benefits.length > 0 && (
                            <p className="text-on-surface-variant text-xs mt-1">{zone.benefits.join(', ')}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold">{new Intl.NumberFormat('vi-VN').format(zone.price)} đ</p>
                          {zone.availableSlots === 0 && (
                            <span className="inline-block bg-error/20 text-error text-[10px] px-2 py-0.5 rounded uppercase font-bold mt-1">Hết vé</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-on-surface-variant font-body-sm">Chưa có thông tin giá vé.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
          {/* Right Sidebar: Promo & Summary */}
          <div className="lg:col-span-4 space-y-gutter">
            {/* Promo Card */}
            {/* Event Stats */}


          </div>
        </div>
          </>
        )}
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
