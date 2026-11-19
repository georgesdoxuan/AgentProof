// Run: node lib/tld.check.mjs
import assert from "node:assert/strict";
import { domainExt } from "./tld.ts";

for (const [d, e] of [
  ["nike.com", ".com"], ["www.nike.fr", ".fr"], ["shop.nike.co.uk", ".co.uk"], ["nike.com.br", ".com.br"],
  ["nike.com.au", ".com.au"], ["nike.co", ".co"], ["shop.example.de", ".de"], ["NIKE.COM.", ".com"], ["localhost", ""],
]) assert.equal(domainExt(d), e, d);
console.log("ok");
