import type { Meta } from "@storybook/nextjs-vite";
import { CircleAlert, SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { StatusScreen } from "./StatusScreen";

export default {
  title: "App / StatusScreen",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export const Error = () => (
  <StatusScreen icon={CircleAlert} tone="error" title="Something went wrong" action={<Button variant="primary">Try again</Button>}>
    The screener hit an error it could not recover from. Trying again usually helps.
  </StatusScreen>
);

export const NotFound = () => (
  <StatusScreen icon={SearchX} title="There is nothing at this address" action={<Link href="/">Back to the screener</Link>}>
    The page you asked for does not exist.
  </StatusScreen>
);
