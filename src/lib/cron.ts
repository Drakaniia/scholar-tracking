import { processGraduatingStudents } from './graduation-service';

/**
 * Runs the graduation processing job
 * This function should be called by a scheduled task (cron job) to automatically
 * process graduating students and remove scholarships from those who have graduated
 */
export async function runGraduationProcessing() {
  console.log(`Starting graduation processing at ${new Date().toISOString()}`);
  
  try {
    const result = await processGraduatingStudents();
    
    console.log(`Graduation processing completed at ${new Date().toISOString()}`);
    console.log(`Processed students: ${result.processedStudents}`);
    console.log(`Updated students: ${result.updatedStudents}`);
    console.log(`Removed scholarships: ${result.removedScholarships}`);
    
    return result;
  } catch (error) {
    console.error('Error during graduation processing:', error);
    throw error;
  }
}

// If this file is run directly, execute the function
if (require.main === module) {
  runGraduationProcessing()
    .catch(error => {
      console.error('Cron job failed:', error);
      process.exit(1);
    });
}