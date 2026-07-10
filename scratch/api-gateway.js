const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());

// Định tuyến tĩnh
app.all('/auth/*', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
app.all('/info/*', createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true }));
app.all('/payment/*', createProxyMiddleware({ target: 'http://localhost:3004', changeOrigin: true }));

// --- HỆ THỐNG ACTIVE HEALTH CHECK (KHÁM SỨC KHOẺ) ---
const allBookingServers = [
  { url: 'http://localhost:3002', isHealthy: true },
  { url: 'http://localhost:3012', isHealthy: true },
  { url: 'http://localhost:3022', isHealthy: true }
];

// Khám sức khoẻ mỗi 2 giây
setInterval(() => {
  allBookingServers.forEach(server => {
    const req = http.get(server.url + '/booking/show/1/inventory', (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        if (!server.isHealthy) console.log(`[HealthCheck] 💚 Server ${server.url} ĐÃ HỒI SINH!`);
        server.isHealthy = true;
      }
    });
    req.on('error', () => {
      if (server.isHealthy) console.log(`[HealthCheck] 🔴 Server ${server.url} ĐÃ CHẾT! Gạch tên khỏi danh sách chia bài.`);
      server.isHealthy = false;
    });
    req.setTimeout(1000, () => req.abort());
  });
}, 2000);

let currentServerIndex = 0;

// Định tuyến Động với Round Robin thông minh (Chỉ chia bài cho máy còn sống)
app.all('/booking/*', createProxyMiddleware({
  target: allBookingServers[0].url,
  changeOrigin: true,
  router: function (req) {
    const healthyServers = allBookingServers.filter(s => s.isHealthy);
    
    if (healthyServers.length === 0) {
      console.log(`[API Gateway] CẢNH BÁO: Toàn bộ Cụm Booking đã sập!`);
      return allBookingServers[0].url; // Trả về mặc định để nó tự báo lỗi 502
    }

    currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
    const target = healthyServers[currentServerIndex].url;
    
    // Log gọn lại, không log các luồng SSE ngầm để dễ nhìn
    if (!req.url.includes('/sse')) {
      console.log(`[API Gateway] Khách yêu cầu ${req.url} -> Chia bài cho Server ${target}`);
    }
    return target;
  }
}));

const PORT = 3000;
app.listen(PORT, () => {
  console.log('===================================================');
  console.log(`🚀 TICKETBOX API GATEWAY (SMART LOAD BALANCER) ở cổng ${PORT}`);
  console.log('===================================================');
  console.log(`Đã kích hoạt tính năng [Active Health Check] - Tự động loại bỏ Server chết!`);
});
