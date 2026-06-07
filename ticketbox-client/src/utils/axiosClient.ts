import axios from 'axios';

// Giả lập lưu token vào localStorage
const getToken = () => localStorage.getItem('access_token');
const setToken = (token: string) => localStorage.setItem('access_token', token);
const getRefreshToken = () => localStorage.getItem('refresh_token');

const axiosClient = axios.create({
  baseURL: 'http://localhost:3000', // Sửa lại loại bỏ /api vì NestJS không dùng global prefix
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cơ chế Queue/Lock cho Grace Period
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/login') && 
      !originalRequest.url?.includes('/auth/register') && 
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      // Đã gặp 401, tiến hành lấy token mới
      if (isRefreshing) {
        // Đang refresh, đẩy request hiện tại vào queue chờ đợi
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      const userId = localStorage.getItem('userId');
      return new Promise((resolve, reject) => {
        // Gọi API refresh token
        axios
          .post('http://localhost:3000/auth/refresh', { userId, refreshToken })
          .then(({ data }) => {
            const newToken = data.accessToken;
            setToken(newToken);
            axiosClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = 'Bearer ' + newToken;
            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            reject(err);
            // Xử lý khi refresh token cũng hết hạn -> Đăng xuất
            localStorage.clear();
            window.dispatchEvent(new Event('auth:logout'));
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
