// Re-export the shared, framework-agnostic validation-message helpers so both
// web (here) and mobile (apps/mobile/components/forms) use a single source of
// truth. Implementation lives in @workspace/forms.
export {
  extractValidationErrorMessage,
  flattenValidationErrors,
  translateFormErrorMessage,
  translateZodIssueMessages,
} from "@workspace/forms/validation-messages";
