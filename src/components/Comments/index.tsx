import React from 'react'
import styles from './comments.module.css';
import { useThemeConfig, useColorMode } from '@docusaurus/theme-common'
import type { ThemeConfig } from '@docusaurus/preset-classic'
import Giscus, { GiscusProps } from '@giscus/react'
import { useLocation } from '@docusaurus/router';

// 类型导出
export type GiscusConfig = GiscusProps

const defaultConfig: Partial<GiscusProps> = {
  id: 'comments',
  mapping: 'specific',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  loading: 'lazy',
  strict: '1', // 用根据路径标题自动生成的 sha1 值，精确匹配 github discussion，避免路径重叠（比如父和子路径）时评论加载串了
  lang: 'zh-CN',
}

export default function Comment(): JSX.Element {
  // 将ThemeConfig类型断言为GiscusConfig类型
  const themeConfig = useThemeConfig() as ThemeConfig & { giscus: GiscusProps }

  const giscus = { ...defaultConfig, ...themeConfig.giscus }

  if (!giscus.repo || !giscus.repoId || !giscus.categoryId) {
    throw new Error(
      'You must provide `repo`, `repoId`, and `categoryId` to `themeConfig.giscus`.',
    )
  }

  const path = useLocation().pathname.replace(/^\/|\/$/g, '');
  const firstSlashIndex = path.indexOf('/');
  var subPath: string = ""
  if (firstSlashIndex !== -1) {
    subPath = path.substring(firstSlashIndex + 1)
  } else {
    subPath = "index"
  }

  giscus.term = subPath
  giscus.theme =
    useColorMode().colorMode === 'dark' ? 'transparent_dark' : 'light'

  return (
    <div className={styles.comment}>
      <Giscus {...giscus} />
    </div>
  )
}
