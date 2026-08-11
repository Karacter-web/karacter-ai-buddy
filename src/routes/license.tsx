import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/license")({
  head: () => ({
    meta: [
      { title: "MIT License — Karacter AI" },
      {
        name: "description",
        content:
          "Karacter AI is released under the MIT License. Read the full permission notice and warranty disclaimer.",
      },
      { property: "og:title", content: "MIT License — Karacter AI" },
      {
        property: "og:description",
        content: "Karacter AI source is MIT licensed — free to use, modify and distribute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: License,
});

function License() {
  return (
    <LegalPage title="MIT License" updated="11 August 2026">
      <p>
        Karacter AI is open source under the MIT License. You may use, copy, modify, merge, publish,
        distribute, sublicense and sell copies of the software, provided the notice below is
        included.
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-4 font-mono text-xs text-foreground">
{`MIT License

Copyright (c) 2026 Karacter AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
      </pre>
      <h2>Contributing</h2>
      <p>
        Contributions, sponsorship and collaboration are welcome via GitHub or{" "}
        <a className="text-primary underline" href="mailto:support@karacterhub.xyz">
          support@karacterhub.xyz
        </a>
        . The MIT licence covers the source code only — hosted deployments remain subject to the
        Terms of Service and the Beta Disclaimer.
      </p>
    </LegalPage>
  );
}
