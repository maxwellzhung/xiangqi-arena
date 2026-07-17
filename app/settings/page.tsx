import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="YOUR DEVICE"
        title="Make the board yours"
        copy="Display and sound choices are saved only on this device. They never affect game rules or server authority."
      />
      <SettingsForm />
    </AppPage>
  );
}
