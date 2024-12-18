import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { GiscusConfig } from '@site/src/components/Comments';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'TinyFunction Blogs',
  tagline: '以小见大，用代码构建知识桥梁',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://tinyfun.club',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
            path: 'articles',
            breadcrumbs: true,
            sidebarPath: 'sidebars.ts',
            routeBasePath: 'articles'
        },
        blog: {
          authorsMapPath: 'authors.json',
          showReadingTime: true,
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          blogPostComponent: require.resolve('./src/theme/BlogPostPage/index.tsx'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          blogSidebarTitle: '近期博客',
          blogSidebarCount: 50,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'TinyFunction',
      logo: {
        alt: 'TinyFunction Logo',
        src: 'img/logo.jpeg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'articlesSidebar',
          position: 'left',
          label: '博客',
        },
        {to: '/blog', label: '小记', position: 'left'},
        {
          href: 'https://github.com/TinyFunction',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '优质内容',
          items: [
            {
              label: '博客',
              to: '/articles/intro',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '小记',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/TinyFunction',
            },
          ],
        },
        {
          title: '友情链接',
          items: [
            {
              label: 'wjc133 的 CSDN 博客',
              href: 'https://blog.csdn.net/wjc133',
            },
            {
              label: 'onecastle\'s blog',
              href: 'https://onecastle.cn',
            },
            {
              label: 'Agility6\'s blog',
              href: 'https://agility6.site/blog/'
            }
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TinyFunction, Inc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    giscus: {
      repo: 'TinyFunction/blogs',
      repoId: 'R_kgDONTNBrA',
      category: 'General',
      categoryId: 'DIC_kwDONTNBrM4Ck2QY',
    } satisfies Partial<GiscusConfig>,
  } satisfies Preset.ThemeConfig,
};

export default config;
