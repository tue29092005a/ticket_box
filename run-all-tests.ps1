$ErrorActionPreference = "Stop"

# Cleanup from previous runs
Write-Host "Stopping any running services..."
node test/helpers/server-control.js kill-all
docker-compose down

Write-Host "Starting Docker services..."
docker-compose up -d

Write-Host "Waiting 30 seconds for DB to fully initialize..."
Start-Sleep -Seconds 30

Write-Host "Starting Node.js services in background..."
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:auth" -WindowStyle Hidden
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:info" -WindowStyle Hidden
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:payment" -WindowStyle Hidden
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:worker" -WindowStyle Hidden
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:booking" -WindowStyle Hidden

Start-Process -FilePath "npx.cmd" -ArgumentList "cross-env", "PORT=3012", "SERVICE_NAME=booking", "ts-node", "src/main.ts" -WindowStyle Hidden
Start-Process -FilePath "npx.cmd" -ArgumentList "cross-env", "PORT=3022", "SERVICE_NAME=booking", "ts-node", "src/main.ts" -WindowStyle Hidden

Write-Host "Waiting 30 seconds for Node.js services to boot and seed DB..."
Start-Sleep -Seconds 30

# Create reports directory
if (!(Test-Path -Path "test_reports")) {
    New-Item -ItemType Directory -Path "test_reports"
}

Write-Host "Running Test 3: Info Service (30s)..."
k6 run test/k6-info-service.js | Out-File -FilePath "test_reports/report_info_service.txt" -Encoding utf8

Write-Host "Running Test 1: Caching (60s)..."
k6 run test/k6-caching.js | Out-File -FilePath "test_reports/report_caching.txt" -Encoding utf8

Write-Host "Running Test 2: Booking Flow (30s)..."
k6 run test/k6-booking-flow.js | Out-File -FilePath "test_reports/report_booking_flow.txt" -Encoding utf8

Write-Host "Running Test 4: Load Balancing (15s)..."
k6 run test/k6-load-balancing.js | Out-File -FilePath "test_reports/report_load_balancing.txt" -Encoding utf8

Write-Host "Running Test 5: Worker (1m)..."
k6 run test/k6-worker.js | Out-File -FilePath "test_reports/report_worker.txt" -Encoding utf8

Write-Host "Running Test 7: E2E Flash Sale (1m)..."
k6 run test/k6-e2e-flash-sale.js | Out-File -FilePath "test_reports/report_flash_sale.txt" -Encoding utf8

Write-Host "Running Test 6: Graceful Degradation (30s)..."
# Kill the node servers to simulate down state
node test/helpers/server-control.js kill-all
Start-Sleep -Seconds 2
k6 run test/k6-graceful-degradation.js | Out-File -FilePath "test_reports/report_graceful.txt" -Encoding utf8

Write-Host "Cleaning up docker..."
docker-compose down

Write-Host "Done!"
