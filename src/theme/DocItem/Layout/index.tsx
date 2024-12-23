import React from 'react';
import Layout from '@theme-original/DocItem/Layout';
import type LayoutType from '@theme/DocItem/Layout';
import type { WrapperProps } from '@docusaurus/types';
import Comment from '@site/src/components/Comments';
import {useDoc} from '@docusaurus/plugin-content-docs/client';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(propsLayout: Props): JSX.Element {
  const { hide_comment: hideComment } = useDoc().frontMatter;
  return (
    <>
      <Layout {...propsLayout} />
      {!hideComment && <Comment />}
    </>
  );
}
