'use client';

/**
 * Component to show a notification when form data is restored
 */
export function FormRestoredNotification({
  show,
  onDismiss,
  onClear,
}: {
  show: boolean;
  onDismiss: () => void;
  onClear: () => void;
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900">
              Form data restored
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              Your previous form input has been restored. You can continue where you left off.
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear
          </button>
          <button
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
