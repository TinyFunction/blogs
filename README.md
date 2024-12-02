# TinyFunction Blogs

## 编写博客

在 blog 目录下直接新增 `xxxx.md` 文件；或者新增 `xxxx` 目录，然后在 `xxxx` 目录中新增 `index.md` 文件。

前者适用于短小的，无附件的博客文章。后者适用于复杂的，带图片或其他附件的博客文章。

### 添加或修改作者信息

修改 `/blog/authors.yml` 文件即可。

如：

```yml
wjc133:
  name: wjc133   # 展示昵称
  title: Back-end Engineer @ SHOPLINE  # 副标题
  url: https://github.com/wjc133   # 点击头像后的跳转链接
  image_url: https://github.com/wjc133.png   # 头像
  page: true
  socials:   # 社交媒体信息，支持github、facebook、x等
    github: wjc133
```

### 添加或修改标签

修改 `/blog/tags.yml` 文件即可。

如：

```yml
io: # tag的内部id
  label: I/O  # tag的展示名称
  permalink: /io  # tag的链接，要求唯一
  description: I/O related technologies  # tag的描述
```

### 博客文章的 front-matter

在博客 md 文件的最前面通常有一串用横线隔开的非标准Markdown格式。这种拓展格式为front-matter。

```
---
slug: computer-arch  # url 资源标识，要求唯一
title: 计算机架构     # 博客标题
authors: [wjc133]   # 博客作者列表，英文逗号分割
tags: [others]      # 博客标签列表
---
```

## 本地调试

确保本地安装了 node v20.0 以上版本。推荐使用 yarn 或 pnpm。

```bash
$ yarn
$ yarn start
```

## CI/CD

本项目已经配置了 Github Actions。

项目提交或合并到 `main` 分支时，会自动触发构建。构建成功后，访问 `https://tinyfun.club` 查看效果。



