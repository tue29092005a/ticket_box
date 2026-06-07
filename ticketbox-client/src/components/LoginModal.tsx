import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  message?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, message }) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xác thực thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#1a1c29] to-[#0f1016] rounded-2xl p-8 w-full max-w-md shadow-[0_0_40px_rgba(139,92,246,0.3)] border border-purple-500/20 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
            {isLoginMode ? 'Đăng Nhập' : 'Đăng Ký'}
          </h2>
          <p className="text-gray-400 text-sm">
            {isLoginMode ? (message || 'Đăng nhập vào tài khoản của bạn') : 'Tạo tài khoản mới để trải nghiệm ticketbox'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Địa chỉ Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: user@example.com"
              className="w-full bg-[#2a2d3e] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
              className="w-full bg-[#2a2d3e] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              disabled={loading}
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : (isLoginMode ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản')}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          {isLoginMode ? (
            <p>
              Chưa có tài khoản?{' '}
              <button onClick={() => setIsLoginMode(false)} className="text-purple-400 font-bold hover:text-pink-400 transition-colors">
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button onClick={() => setIsLoginMode(true)} className="text-purple-400 font-bold hover:text-pink-400 transition-colors">
                Đăng nhập
              </button>
            </p>
          )}
        </div>
        

      </div>
    </div>
  );
};
