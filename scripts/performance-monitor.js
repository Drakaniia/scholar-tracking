/**
 * Performance Monitoring Script
 * Run this to test API endpoint response times
 */

const API_BASE = 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    const end = performance.now();
    const time = (end - start).toFixed(2);
    const status = response.status;
    
    console.log(`✓ ${name.padEnd(30)} ${time}ms (${status})`);
    return { name, time: parseFloat(time), status, success: response.ok };
  } catch (error) {
    const end = performance.now();
    const time = (end - start).toFixed(2);
    console.log(`✗ ${name.padEnd(30)} ${time}ms (ERROR: ${error.message})`);
    return { name, time: parseFloat(time), status: 'ERROR', success: false };
  }
}

async function runPerformanceTests() {
  console.log('\n=== Performance Test Results ===\n');
  console.log('Testing API endpoints...\n');

  const results = [];

  // Test public endpoints
  results.push(await testEndpoint('Login Page', `${API_BASE}/login`));
  
  // Test API endpoints (without auth for now)
  results.push(await testEndpoint('Dashboard API', `${API_BASE}/api/dashboard`));
  results.push(await testEndpoint('Students API', `${API_BASE}/api/students`));
  results.push(await testEndpoint('Scholarships API', `${API_BASE}/api/scholarships`));
  
  // Calculate statistics
  console.log('\n=== Summary ===\n');
  const successfulTests = results.filter(r => r.success);
  const avgTime = successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length;
  const maxTime = Math.max(...successfulTests.map(r => r.time));
  const minTime = Math.min(...successfulTests.map(r => r.time));
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful: ${successfulTests.length}`);
  console.log(`Failed: ${results.length - successfulTests.length}`);
  console.log(`Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`Fastest: ${minTime.toFixed(2)}ms`);
  console.log(`Slowest: ${maxTime.toFixed(2)}ms`);
  
  // Performance rating
  console.log('\n=== Performance Rating ===\n');
  if (avgTime < 100) {
    console.log('🟢 EXCELLENT - Average response time under 100ms');
  } else if (avgTime < 300) {
    console.log('🟡 GOOD - Average response time under 300ms');
  } else if (avgTime < 1000) {
    console.log('🟠 FAIR - Average response time under 1 second');
  } else {
    console.log('🔴 POOR - Average response time over 1 second');
  }
  
  console.log('\n');
}

// Run tests
runPerformanceTests().catch(console.error);
