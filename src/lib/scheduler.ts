import { logAudit } from './auth';
import { runGraduationProcessing } from './cron';

/**
 * Simple scheduler service for automated tasks in the scholarship tracking system
 * Uses setTimeout/setInterval instead of node-cron for simplicity
 */

class SchedulerService {
  private scheduledTasks: NodeJS.Timeout[] = [];

  /**
   * Schedules all automated tasks
   */
  public async scheduleAllTasks() {
    // Schedule graduation processing to run daily at midnight (in milliseconds)
    // Calculate time until next midnight
    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0); // Next midnight
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

    // Schedule the first run for next midnight
    const graduationTask = setTimeout(async () => {
      await this.executeGraduationProcessing();

      // After execution, schedule the next day's run (every 24 hours)
      const dailyInterval = setInterval(
        async () => {
          await this.executeGraduationProcessing();
        },
        24 * 60 * 60 * 1000
      ); // Every 24 hours

      // Add the interval to our tasks list to manage it
      this.scheduledTasks.push(dailyInterval as unknown as NodeJS.Timeout);
    }, timeUntilMidnight);

    this.scheduledTasks.push(graduationTask);

    console.log('Graduation processing scheduled for:', nextMidnight.toISOString());
    console.log('All scheduled tasks have been set up');
  }

  /**
   * Executes the graduation processing task with error handling and audit logging
   */
  private async executeGraduationProcessing() {
    console.log(`Starting scheduled graduation processing at ${new Date().toISOString()}`);
    try {
      const result = await runGraduationProcessing();
      console.log(`Scheduled graduation processing completed:`, result);

      // Log audit for the automated task
      await logAudit(
        null, // System-initiated task
        'SCHEDULED_GRADUATION_PROCESSING',
        'SYSTEM',
        undefined,
        {
          processedStudents: result.processedStudents,
          updatedStudents: result.updatedStudents,
          removedScholarships: result.removedScholarships,
          cancelledDisbursements: result.cancelledDisbursements,
          errors: result.errors,
          executedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Error during scheduled graduation processing:', error);

      // Log audit for the failure
      await logAudit(
        null, // System-initiated task
        'SCHEDULED_GRADUATION_PROCESSING_FAILED',
        'SYSTEM',
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          executedAt: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Schedules a one-time task to run after a specified delay
   */
  public scheduleOneTimeTask(
    delayMs: number,
    task: () => Promise<void>,
    name: string
  ): NodeJS.Timeout {
    const taskTimeout = setTimeout(async () => {
      console.log(`Running one-time task: ${name} at ${new Date().toISOString()}`);
      try {
        await task();
      } catch (error) {
        console.error(`Error in one-time task ${name}:`, error);
      }
    }, delayMs);

    this.scheduledTasks.push(taskTimeout);
    return taskTimeout;
  }

  /**
   * Schedules a recurring task to run at specified intervals
   */
  public scheduleRecurringTask(
    intervalMs: number,
    task: () => Promise<void>,
    name: string
  ): NodeJS.Timeout {
    const taskInterval = setInterval(async () => {
      console.log(`Running recurring task: ${name} at ${new Date().toISOString()}`);
      try {
        await task();
      } catch (error) {
        console.error(`Error in recurring task ${name}:`, error);
      }
    }, intervalMs);

    this.scheduledTasks.push(taskInterval);
    return taskInterval;
  }

  /**
   * Stops all scheduled tasks
   */
  public stopAllTasks() {
    this.scheduledTasks.forEach((task) => {
      // Since we're using both setTimeout and setInterval,
      // we need to handle both timeout and interval types
      // In Node.js, both clearTimeout and clearInterval are safe to call on either
      clearTimeout(task);
      clearInterval(task);
    });
    this.scheduledTasks = [];
    console.log('All scheduled tasks have been stopped');
  }

  /**
   * Gets information about scheduled tasks
   */
  public getTaskCount(): number {
    return this.scheduledTasks.length;
  }
}

// Create a singleton instance
export const schedulerService = new SchedulerService();

// Initialize scheduler when module is loaded
export async function initializeScheduler() {
  try {
    await schedulerService.scheduleAllTasks();
    console.log('Scheduler initialized successfully');
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
  }
}

// Export for use in server startup
export default schedulerService;
