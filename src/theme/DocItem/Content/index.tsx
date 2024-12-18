import { useDoc } from "@docusaurus/plugin-content-docs/client";
import { ThemeClassNames } from "@docusaurus/theme-common";
import DocItemAuthors from "@site/src/theme/DocItem/Authors";
import MDXContent from "@theme/MDXContent";
import clsx from "clsx";
import React from "react";

export default function DocItemContent({ children }) {
  const {title} = useDoc().frontMatter;
  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, "markdown")}>
        <>
          <h1>{title}</h1>
          <DocItemAuthors />
          <MDXContent>{children}</MDXContent>
        </>
    </div>
  );
}
