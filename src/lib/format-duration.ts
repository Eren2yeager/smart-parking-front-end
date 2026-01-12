/**
 * Format duration in minutes to human-readable format
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m", "45m", "1d 3h")
 */
export function formatDuration(minutes: number): string {
  // Handle edge cases
  if (minutes < 0) {
    return '0m';
  }

  if (minutes < 1) {
    return '< 1m';
  }

  // Less than 1 hour - show minutes only
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }

  // Less than 24 hours - show hours and minutes
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (mins === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${mins}m`;
  }

  // 24 hours or more - show days and hours
  const days = Math.floor(minutes / 1440);
  const remainingMinutes = minutes % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = Math.floor(remainingMinutes % 60);

  if (hours === 0 && mins === 0) {
    return `${days}d`;
  }

  if (hours === 0) {
    return `${days}d ${mins}m`;
  }

  if (mins === 0) {
    return `${days}d ${hours}h`;
  }

  // For very long durations, omit minutes for brevity
  if (days > 1) {
    return `${days}d ${hours}h`;
  }

  return `${days}d ${hours}h ${mins}m`;
}

/**
 * Format duration with more detail for tooltips or detailed views
 * @param minutes - Duration in minutes
 * @returns Detailed formatted duration string
 */
export function formatDurationDetailed(minutes: number): string {
  if (minutes < 0) {
    return '0 minutes';
  }

  if (minutes < 1) {
    return 'Less than 1 minute';
  }

  if (minutes < 60) {
    const mins = Math.floor(minutes);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }

  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(minutes / 1440);
  const remainingMinutes = minutes % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  
  if (hours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
}
