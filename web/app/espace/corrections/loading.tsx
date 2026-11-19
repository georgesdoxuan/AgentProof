import { SkSpace, SkGroup } from "../../skeleton";

// Corrections: no visible title, the chips, the status tabs and filters, then one list of rows.
export default function Loading() {
  return (
    <SkSpace bare intro="chips" action>
      <SkGroup title={false} rows={6} />
    </SkSpace>
  );
}
