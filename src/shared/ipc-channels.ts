export const IPC_CHANNELS = {
  // App
  GET_VERSION: 'app:get-version',
  MINIMIZE: 'app:minimize',
  MAXIMIZE: 'app:maximize',
  CLOSE: 'app:close',

  // Settings
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',

  // Task execution
  START_TASK: 'task:start',
  CANCEL_TASK: 'task:cancel',
  APPROVAL_RESPONSE: 'task:approval-response',

  // Browser control
  TAKEOVER_BROWSER: 'browser:takeover',
  NAVIGATE_BROWSER: 'browser:navigate',
  RELOAD_BROWSER: 'browser:reload',

  // History & Artifacts
  GET_HISTORY: 'history:get-all',
  GET_TASK_DETAILS: 'history:get-details',
  OPEN_ARTIFACT: 'artifacts:open',
  GET_ARTIFACT_CONTENT: 'artifacts:get-content',

  // Push events to renderer
  EVENT_PLAN_UPDATED: 'event:plan-updated',
  EVENT_STEP_UPDATED: 'event:step-updated',
  EVENT_LOG_ADDED: 'event:log-added',
  EVENT_STATUS_CHANGED: 'event:status-changed',
  EVENT_APPROVAL_REQUEST: 'event:approval-request',
  EVENT_BROWSER_STATE: 'event:browser-state',
} as const;
