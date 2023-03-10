import {
  render,
  Banner,
  TextField,
  Heading,
  BlockStack,
  useSettings, // added this import to allow custom settings to pull into the app as variables
  useExtensionCapability,
  useBuyerJourneyIntercept,
} from "@shopify/checkout-ui-extensions-react";
import React, { useState, useEffect } from "react";

// Set the entry point for the extension
render("Checkout::Contact::RenderAfter", () => <App />);

function App() {
  // Set the target age that a buyer must be to complete an order as well as the error message
  // Now using the merchant-defined settings to retrieve the values
  const {age_threshold, age_error, age_label, age_title, age_missing_error} = useSettings();

  // Set defaults if a merchant didn't configure the settings in the checkout editor
  const ageTarget = age_threshold ?? 18;
  const ageError = age_error ?? "You're not legally old enough to buy some of the items in your cart.";
  const ageLabel = age_label ?? "Your age";
  const ageTitle = age_title ?? "Age Verification";
  const ageMissingError = age_missing_error ?? "Enter your age";

  // Set up the app state
  const [age, setAge] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  // Merchants can toggle the `block_progress` capability behavior within the checkout editor
  // To give the best preview experience, ensure that your extension updates its UI accordingly
  // For this example, the extension subscribes to `capabilities`, and updates the `label` and `required` attributes for the `TextField` component
  const canBlockProgress = useExtensionCapability("block_progress");
  const label = canBlockProgress ? ageLabel : `${ageLabel} (optional)`; // different message will appear if they disable "block progress"
  
  // If age is not valid, show validation errors
  useEffect(() => {
    if (canBlockProgress && isAgeSet() && !isAgeValid()) {
      showValidationErrors();
      return;
    }
    clearValidationErrors();
  }, [age]);

  // Use the `buyerJourney` intercept to conditionally block checkout progress
  // The ability to block checkout progress isn't guaranteed.
  // Refer to the "Checking for the ability to block checkout progress" section for more information.
  useBuyerJourneyIntercept(() => {
    // Validate that the age of the buyer is known, and that they're old enough to complete the purchase
    if (!isAgeSet()) {
      return {
        behavior: "block",
        reason: "Age is required",
        perform: (result) => {
          // If we were able to block progress, set a validation error
          if (result.behavior === "block") {
            setValidationError({ageMissingError});
          }
        },
      };
    }

    if (!isAgeValid()) {
      return {
        behavior: "block",
        reason: `Age is less than ${ageTarget}.`,
        perform: (result) => {
          // If progress can be blocked, then set a validation error, and show the banner
          if (result.behavior === "block") {
            showValidationErrors();
          }
        },
      };
    }

    return {
      behavior: "allow",
      perform: () => {
        // Ensure any errors are hidden
        clearValidationErrors();
      },
    };
  });

  function isAgeSet() {
    return age !== "";
  }

  function isAgeValid() {
    return Number(age) >= ageTarget;
  }

  function showValidationErrors() {
    setShowErrorBanner(true);
  }

  function clearValidationErrors() {
    setValidationError("");
    setShowErrorBanner(false);
  }

  // Render the extension
  return (
    <BlockStack>
      <Heading level={3}>{ageTitle}</Heading>
      {showErrorBanner && (
        <Banner status="critical">
          {ageError}
        </Banner>
      )}
      <TextField
        label={label}
        type="number"
        value={age}
        onChange={setAge}
        onInput={clearValidationErrors}
        required={canBlockProgress}
        error={validationError}
      ></TextField>
    </BlockStack>
  );
}
