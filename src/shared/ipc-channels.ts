export const IPC_CHANNELS = {
  // App & Window
  GET_VERSION: 'app:get-version',
  MINIMIZE: 'app:minimize',
  MAXIMIZE: 'app:maximize',
  CLOSE: 'app:close',
  IS_MAXIMIZED: 'app:is-maximized',

  // Tabs Management
  TAB_CREATE: 'tab:create',
  TAB_SWITCH: 'tab:switch',
  TAB_CLOSE: 'tab:close',
  TAB_GET_ALL: 'tab:get-all',
  TAB_GET_ACTIVE: 'tab:get-active',
  TAB_SET_BOUNDS: 'tab:set-bounds',

  // Navigation
  NAV_NAVIGATE: 'nav:navigate',
  NAV_GO_BACK: 'nav:go-back',
  NAV_GO_FORWARD: 'nav:go-forward',
  NAV_RELOAD: 'nav:reload',
  NAV_STOP: 'nav:stop',
  NAV_GO_HOME: 'nav:go-home',

  // Bookmarks
  BOOKMARKS_GET: 'bookmarks:get',
  BOOKMARKS_ADD: 'bookmarks:add',
  BOOKMARKS_REMOVE: 'bookmarks:remove',
  BOOKMARKS_IS_BOOKMARKED: 'bookmarks:is-bookmarked',

  // History
  HISTORY_GET: 'history:get',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_REMOVE: 'history:remove',

  // Downloads
  DOWNLOADS_GET: 'downloads:get',
  DOWNLOADS_OPEN_FILE: 'downloads:open-file',
  DOWNLOADS_SHOW_IN_FOLDER: 'downloads:show-in-folder',
  DOWNLOADS_CANCEL: 'downloads:cancel',

  // Browser Settings
  SETTINGS_GET_BROWSER: 'settings:get-browser',
  SETTINGS_SAVE_BROWSER: 'settings:save-browser',

  // Legacy & Agent Settings
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',
  START_TASK: 'task:start',
  CANCEL_TASK: 'task:cancel',
  APPROVAL_RESPONSE: 'task:approval-response',
  TAKEOVER_BROWSER: 'browser:takeover',
  NAVIGATE_BROWSER: 'browser:navigate',
  RELOAD_BROWSER: 'browser:reload',
  GET_HISTORY: 'history:get-all',
  GET_TASK_DETAILS: 'history:get-details',
  OPEN_ARTIFACT: 'artifacts:open',
  GET_ARTIFACT_CONTENT: 'artifacts:get-content',

  // Push Events to Renderer
  EVENT_TABS_UPDATED: 'event:tabs-updated',
  EVENT_ACTIVE_TAB_CHANGED: 'event:active-tab-changed',
  EVENT_TAB_UPDATED: 'event:tab-updated',
  EVENT_DOWNLOAD_UPDATED: 'event:download-updated',
  EVENT_HISTORY_UPDATED: 'event:history-updated',
  EVENT_BOOKMARKS_UPDATED: 'event:bookmarks-updated',
  EVENT_SETTINGS_UPDATED: 'event:settings-updated',

  // Legacy Agent Events
  EVENT_PLAN_UPDATED: 'event:plan-updated',
  EVENT_STEP_UPDATED: 'event:step-updated',
  EVENT_LOG_ADDED: 'event:log-added',
  EVENT_STATUS_CHANGED: 'event:status-changed',
  EVENT_APPROVAL_REQUEST: 'event:approval-request',
  EVENT_BROWSER_STATE: 'event:browser-state',
} as const;
