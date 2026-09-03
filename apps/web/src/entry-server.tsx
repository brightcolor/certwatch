import { renderToString } from "react-dom/server";
import { FrontPage } from "./pages/FrontPage";

export type BootConfig = {
  setupRequired: boolean;
  frontPageEnabled: boolean;
  publicRegistrationEnabled: boolean;
};

/* Renders the public front page on the server so a crawler — and a first-time
   visitor — receives the content itself rather than an empty div waiting for
   JavaScript. Only this page is rendered here: everything else needs a session,
   and no crawler ever reaches it.

   The callbacks are no-ops on the server; the client attaches the real ones
   when it hydrates. */
export function renderFrontPage(config: BootConfig): string {
  const noop = () => undefined;
  return renderToString(
    <FrontPage
      setupRequired={config.setupRequired}
      registrationEnabled={config.publicRegistrationEnabled}
      onAuth={noop}
      onRegister={noop}
    />
  );
}
