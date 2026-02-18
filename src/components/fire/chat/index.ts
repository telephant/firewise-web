// Legacy floating dialog (kept for backward compatibility)
export { ChatDialog, ChatTrigger, ChatPanel } from './chat-dialog';

// New side panel components
export { ChatSidePanel } from './chat-side-panel';
export { ChatToggleButton } from './chat-toggle-button';

// Preview panel for main stage hijack
export { PreviewPanel } from './preview-panel';

// Preview mapper utilities
export {
  mapAIDataToFormState,
  getInitialCategory,
  getPresetFromCategory,
  getCategoryPresetId,
  isDebtFlow,
  isInvestmentFlow,
} from './preview-mapper';
