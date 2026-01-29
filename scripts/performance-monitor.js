/**
 * Performance Monitoring Script
 * Run this to test API endpoint response times and caching effectiveness
 */

const API_BASE = 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    const end = performance.now();
    const time = (end - start).toFixed(2);
    const status = response.status;
    
    console.log(`✓ ${name.padEnd(40)} ${time.toString().padStart(8)}ms (${status})`);
    return { name, time: parseFloat(time), status, success: response.ok };
  } catch (error) {
    const end = performance.now();
    const time = (end - start).toFixed(2);
    console.log(`✗ ${name.padEnd(40)} ${time.toString().padStart(8)}ms (ERROR: ${error.message})`);
    return { name, time: parseFloat(time), status: 'ERROR', success: false };
  }
}

async function testCaching(name, url) {
  console.log(`\n📦 Testing cache for: ${name}`);
  
  // First call - cold cache
  const start1 = performance.now();
  await fetch(url);
  const time1 = (performance.now() - start1).toFixed(2);
  console.log(`   Cold cache:  ${time1}ms`);
  
  // Second call - should be cached
  const start2 = performance.now();
  await fetch(url);
  const time2 = (performance.now() - start2).toFixed(2);
  console.log(`   Cached:      ${time2}ms`);
  
  const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(`   Improvement: ${improvement}% faster`);
  
  return { cold: parseFloat(time1), cached: parseFloat(time2), improvement: parseFloat(improvement) };
}

async function runPerformanceTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         PERFORMANCE TEST RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Testing API endpoints...\n');

  const results = [];

  // Test public endpoints
  results.push(await testEndpoint('Login Page', `${API_BASE}/login`));
  results.push(await testEndpoint('Dashboard Page', `${API_BASE}/`));
  results.push(await testEndpoint('Students Page', `${API_BASE}/students`));
  results.push(await testEndpoint('Scholarships Page', `${API_BASE}/scholarships`));
  results.push(await testEndpoint('Reports Page', `${API_BASE}/reports`));
  results.push(await testEndpoint('Settings Page', `${API_BASE}/settings`));
  
  console.log('\n📡 Testing API endpoints...\n');
  
  // Test API endpoints (without auth for now)
  results.push(await testEndpoint('Dashboard API', `${API_BASE}/api/dashboard`));
  results.push(await testEndpoint('Dashboard Detailed API', `${API_BASE}/api/dashboard/detailed`));
  results.push(await testEndpoint('Students API', `${API_BASE}/api/students?limit=100`));
  results.push(await testEndpoint('Scholarships API', `${API_BASE}/api/scholarships`));
  
  // Test caching effectiveness
  console.log('\n' + '═'.repeat(60));
  console.log('CACHE PERFORMANCE TEST');
  console.log('═'.repeat(60));
  
  const cacheResults = [];
  cacheResults.push(await testCaching('Dashboard API', `${API_BASE}/api/dashboard`));
  cacheResults.push(await testCaching('Students API', `${API_BASE}/api/students?limit=100`));
  cacheResults.push(await testCaching('Scholarships API', `${API_BASE}/api/scholarships`));
  
  // Calculate statistics
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY STATISTICS');
  console.log('═'.repeat(60) + '\n');
  
  const successfulTests = results.filter(r => r.success);
  const avgTime = successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length;
  const maxTime = Math.max(...successfulTests.map(r => r.time));
  const minTime = Math.min(...successfulTests.map(r => r.time));
  
  console.log(`Total Tests:           ${results.length}`);
  console.log(`Successful:            ${successfulTests.length}`);
  console.log(`Failed:                ${results.length - successfulTests.length}`);
  console.log(`Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`Fastest:               ${minTime.toFixed(2)}ms`);
  console.log(`Slowest:               ${maxTime.toFixed(2)}ms`);
  
  // Cache statistics
  const avgCacheImprovement = cacheResults.reduce((sum, r) => sum + r.improvement, 0) / cacheResults.length;
  console.log(`\nCache Performance:`);
  console.log(`Average Improvement:   ${avgCacheImprovement.toFixed(1)}% faster`);
  
  // Performance rating
  console.log('\n' + '═'.repeat(60));
  console.log('PERFORMANCE RATING');
  console.log('═'.repeat(60) + '\n');
  
  if (avgTime < 100) {
    console.log('🟢 EXCELLENT - Average response time under 100ms');
  } else if (avgTime < 300) {
    console.log('🟡 GOOD - Average response time under 300ms');
  } else if (avgTime < 1000) {
    console.log('🟠 FAIR - Average response time under 1 second');
  } else {
    console.log('🔴 POOR - Average response time over 1 second');
  }
  
  if (avgCacheImprovement > 50) {
    console.log('🚀 CACHE: Excellent - Over 50% improvement');
  } else if (avgCacheImprovement > 20) {
    console.log('✅ CACHE: Good - Over 20% improvement');
  } else {
    console.log('⚠️  CACHE: Needs optimization');
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// Run tests
runPerformanceTests().catch(console.error);
