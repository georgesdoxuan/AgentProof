import { SkSpace, SkGroup, SkForm } from "../../skeleton";

// Automations is its own section of the sidebar (no Réglages tabs): title, a line and chips, then the cards.
export default function Loading() {
  return (
    <SkSpace narrow intro="chips">
      <SkGroup rows={3} />
      <SkGroup>
        <SkForm fields={2} />
      </SkGroup>
    </SkSpace>
  );
}
