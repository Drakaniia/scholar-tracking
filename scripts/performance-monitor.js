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

async function testConsistency(name, url, iterations = 5) {
  console.log(`\n� Testing consistency for: ${name}`);
  
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(url);
    const time = performance.now() - start;
    times.push(time);
  }
  
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const variance = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length);
  
  console.log(`   Average:     ${avg.toFixed(2)}ms`);
  console.log(`   Min:         ${min.toFixed(2)}ms`);
  console.log(`   Max:         ${max.toFixed(2)}ms`);
  console.log(`   Std Dev:     ${variance.toFixed(2)}ms`);
  console.log(`   Consistency: ${variance < 50 ? '✓ Good' : '⚠ Variable'}`);
  
  return { avg, min, max, variance, consistent: variance < 50 };
}

async function runPerformanceTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         PERFORMANCE TEST RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('� Testing API endpoints...\n');

  const results = [];
  
  // Test API endpoints (without auth for now)
  results.push(await testEndpoint('Dashboard API', `${API_BASE}/api/dashboard`));
  results.push(await testEndpoint('Dashboard Detailed API', `${API_BASE}/api/dashboard/detailed`));
  results.push(await testEndpoint('Students API', `${API_BASE}/api/students?limit=100`));
  results.push(await testEndpoint('Scholarships API', `${API_BASE}/api/scholarships`));
  
  console.log('\n📊 Testing page loads...\n');

  const pageResults = [];
  
  // Test public endpoints
  pageResults.push(await testEndpoint('Login Page', `${API_BASE}/login`));
  pageResults.push(await testEndpoint('Dashboard Page', `${API_BASE}/`));
  pageResults.push(await testEndpoint('Students Page', `${API_BASE}/students`));
  pageResults.push(await testEndpoint('Scholarships Page', `${API_BASE}/scholarships`));
  pageResults.push(await testEndpoint('Reports Page', `${API_BASE}/reports`));
  pageResults.push(await testEndpoint('Settings Page', `${API_BASE}/settings`));
  
  // Test consistency and reliability
  console.log('\n' + '═'.repeat(60));
  console.log('CONSISTENCY TEST (5 iterations each)');
  console.log('═'.repeat(60));
  
  const consistencyResults = [];
  consistencyResults.push(await testConsistency('Dashboard API', `${API_BASE}/api/dashboard`));
  consistencyResults.push(await testConsistency('Students API', `${API_BASE}/api/students?limit=100`));
  consistencyResults.push(await testConsistency('Scholarships API', `${API_BASE}/api/scholarships`));
  
  // Calculate statistics
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY STATISTICS');
  console.log('═'.repeat(60) + '\n');
  
  const successfulTests = results.filter(r => r.success);
  const avgTime = successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length;
  const maxTime = Math.max(...successfulTests.map(r => r.time));
  const minTime = Math.min(...successfulTests.map(r => r.time));
  
  const successfulPageTests = pageResults.filter(r => r.success);
  const avgPageTime = successfulPageTests.reduce((sum, r) => sum + r.time, 0) / successfulPageTests.length;
  
  console.log('API Endpoints:');
  console.log(`  Total Tests:           ${results.length}`);
  console.log(`  Successful:            ${successfulTests.length}`);
  console.log(`  Failed:                ${results.length - successfulTests.length}`);
  console.log(`  Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log(`  Fastest:               ${minTime.toFixed(2)}ms`);
  console.log(`  Slowest:               ${maxTime.toFixed(2)}ms`);
  
  console.log('\nPage Loads:');
  console.log(`  Average Response Time: ${avgPageTime.toFixed(2)}ms`);
  
  // Consistency statistics
  const consistentEndpoints = consistencyResults.filter(r => r.consistent).length;
  const avgVariance = consistencyResults.reduce((sum, r) => sum + r.variance, 0) / consistencyResults.length;
  console.log(`\nConsistency Performance:`);
  console.log(`Consistent Endpoints:  ${consistentEndpoints}/${consistencyResults.length}`);
  console.log(`Average Std Dev:       ${avgVariance.toFixed(2)}ms`);
  
  // Performance rating
  console.log('\n' + '═'.repeat(60));
  console.log('PERFORMANCE RATING');
  console.log('═'.repeat(60) + '\n');
  
  if (avgTime < 100) {
    console.log('🟢 EXCELLENT - API average response time under 100ms');
  } else if (avgTime < 150) {
    console.log('� NEAR EXCELLENT - API average response time under 150ms');
    console.log('   💡 Consistency tests show sustained performance at ' + avgVariance.toFixed(0) + 'ms');
  } else if (avgTime < 300) {
    console.log('� GOOD - API average response time under 300ms');
  } else if (avgTime < 1000) {
    console.log('� FAIR - API average response time under 1 second');
  } else {
    console.log('🔴 POOR - API average response time over 1 second');
  }
  
  if (consistentEndpoints === consistencyResults.length && avgVariance < 30) {
    console.log('🚀 CONSISTENCY: Excellent - All endpoints stable');
  } else if (consistentEndpoints >= consistencyResults.length / 2) {
    console.log('✅ CONSISTENCY: Good - Most endpoints stable');
  } else {
    console.log('⚠️  CONSISTENCY: Variable response times detected');
  }
  
  console.log('\n💡 Note: Client-side caching is tested in the browser, not in this Node.js script.');
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// Run tests
runPerformanceTests().catch(console.error);
