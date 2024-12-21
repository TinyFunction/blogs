---
slug: simple-github-action
title: 初探 Github Action
authors: [wjc133]
tags: [devops]
---

## 起因

由于我们的博客是多人共同创作的，为了能及时得知有人发布了博客，希望能够在博客发布后通过企业微信的群机器人消息进行通知。于是就有了对 Github Action 的一些探索，我在这里记录一下。

BTW: 除了使用企业微信进行通知，其实更见的方式是直接订阅我们的 RSS。

## 什么是 Github Action

Github 有一个 Action 的功能，其实就是 CI/CD。像 jenkins、teamcity 等有自己的 CI/CD 描述语法，gitlab 有 `.gitlab.yml` 文件，Github 可以使用 `.github/workflows/xxx.yml` 文件来定义 CI/CD 的流程。一个 yml 文件中可以包含多个 job，job 之间可以指定依赖关系。

一个简单的示例如下：

```yml
jobs:
  job1:
  job2:
    needs: job1
  job3:
    if: ${{ always() }}
    needs: [job1, job2]
  job4:
```

在此示例中，由于 job1 和 job4 之间没有任何依赖关系，所以它俩是并行执行的。job2 依赖 job1 的执行成功结果，因此只有在 job1 执行成功后，才会执行 job2。job3 使用了 `${{ always() }}` 条件表达式，因此不管 job1 和 job2 的执行结果如何，只要这两个 job 跑完了，就会开始跑 job3。

每个 job 又可以包含多个步骤，示例如下：

```yml
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20.x
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
```

通过`environment`设置环境变量，通过`runs-on`指定执行的容器环境。然后在`steps`中指定步骤。

典型的步骤就是，先 checkout 代码，然后准备编译环境，再对代码进行编译，最后将编译产出结果用于生产部署或 release 发布。

## 实现博客时变更发送企业微信消息

回到开头时我们的诉求，是在博客变更时发企业微信消息通知大家。

所以分开两个步骤，一个是**检查博客变更**，另一个是**发送企业微信消息**。了解这两点的原理后，如果你需要监听其他博客的变更，例如`hexo`等；或者你需要发送消息到其他平台。简单修改代码就都可以实现了。

### 检查博客变更

思路：既然构建时先检出了代码，证明我们可以在工作目录中基于本地仓库做任何的事情了。所以我可以用 `HEAD` 版本和 `HEAD-1` 的版本进行对比，列出被修改文件的名称。

```shell
# 列出对比上版本新增的，在 blog 目录下以 md 结尾的文件名
git diff --diff-filter=A --name-only HEAD^ | grep '^blog/.*\.md$'
# 列出对比上版本修改的，在 blog 目录下以 md 结尾的文件
git diff --diff-filter=M --name-only HEAD^ | grep '^blog/.*\.md$'
# 列出对比上版本删除的，在 blog 目录下以 md 结尾的文件
git diff --diff-filter=D --name-only HEAD^ | grep '^blog/.*\.md$'
```

然后，再读取文件头部的 FrontMatter，从中提取 slug 和 title，即可用于拼装发送的消息。

### 发送企业微信信息

发送消息就更简单了，企业微信群里新建一个企微机器人，copy webhook url，然后根据企微机器人的[消息格式](https://developer.work.weixin.qq.com/document/path/91770)进行发送即可。

发送时可以使用 curl 构建请求。

⚠️ 注意：这种 webhook 都是没有任何鉴权的，因此一定要保护好隐私，不能直接硬编码在配置文件中。而是应该通过 `Settings --> Secrets and variables --> Actions --> Repository secrets` 进行配置。

### 完整示例

```yml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main  # 指定触发分支

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 2  # 拉取完整的提交历史
      # 👇 Build steps
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20.x
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      # 👆 Build steps
      - name: Setup Pages
        uses: actions/configure-pages@v3
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          # 👇 Specify build output path
          path: build
      - name: Check blog posts changes
        id: check_blogs
        run: |
          if [ $(git rev-list --count HEAD) -eq 1 ]; then
            echo "Initial commit detected. Skipping blog change detection."
            echo "blogs_changed=false" >> $GITHUB_ENV
            exit 0
          fi

          ADDED_BLOGS=$(git diff --diff-filter=A --name-only HEAD^ | grep '^blog/.*\.md$' || true)
          UPDATED_BLOGS=$(git diff --diff-filter=M --name-only HEAD^ | grep '^blog/.*\.md$' || true)
          REMOVED_BLOGS=$(git diff --diff-filter=D --name-only HEAD^ | grep '^blog/.*\.md$' || true)

          if [ -n "$ADDED_BLOGS"]; then
            echo "New blog posts added: $ADDED_BLOGS"
          fi

          if [ -n "$UPDATED_BLOGS"]; then
            echo "Blog posts updated: $UPDATED_BLOGS"
          fi

          if [ -n "$REMOVED_BLOGS"]; then
            echo "Blog posts removed: $REMOVED_BLOGS"
          fi

          echo "added_blogs=$ADDED_BLOGS" >> $GITHUB_ENV
          echo "updated_blogs=$UPDATED_BLOGS" >> $GITHUB_ENV
          echo "removed_blogs=$REMOVED_BLOGS" >> $GITHUB_ENV

          if [ -n "$ADDED_BLOGS" ] || [ -n "$UPDATED_BLOGS" ] || [ -n "$REMOVED_BLOGS" ]; then
            echo "blogs_changed=true" >> $GITHUB_ENV
          else
            echo "blogs_changed=false" >> $GITHUB_ENV
          fi
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
      - name: Send WeChat notification
        id: send_wechat
        if: env.blogs_changed == 'true'
        env:
          WECHAT_WEBHOOK: ${{ secrets.WECHAT_WEBHOOK }}
          ADDED_BLOGS: ${{ env.added_blogs }}
          UPDATED_BLOGS: ${{ env.updated_blogs }}
          REMOVED_BLOGS: ${{ env.removed_blogs }}
          BASE_URL: https://tinyfun.club
        run: |
          extract_slug() {
            local file=$1
            local slug=$(awk '/^slug:/ {print $2}' "$file")
            if [ -z "$slug" ]; then
              slug=$(basename "$file" .md)
            fi
            echo "$slug"
          }

          extract_title() {
            local file=$1
            local title=$(awk '/^title:/ {print $2}' "$file")
            if [ -z "$title" ]; then
              title="$file"
            fi
            echo "$title"
          }

          if [ -n "$ADDED_BLOGS" ]; then
            ADDED_LIST=$(echo "$ADDED_BLOGS" | while read -r line; do
              SLUG=$(extract_slug "$line")
              TITLE=$(extract_title "$line")
              echo "- [${TITLE}](${BASE_URL}/blog/${SLUG})"
            done)
          else
            ADDED_LIST="无新增博客"
          fi

          if [ -n "$UPDATED_BLOGS" ]; then
            UPDATED_LIST=$(echo "$UPDATED_BLOGS" | while read -r line; do
              SLUG=$(extract_slug "$line")
              TITLE=$(extract_title "$line")
              echo "- [${TITLE}](${BASE_URL}/blog/${SLUG})"
            done)
          else
            UPDATED_LIST="无更新博客"
          fi

          if [ -n "$REMOVED_BLOGS" ]; then
            REMOVED_LIST=$(echo "$REMOVED_BLOGS" | while read -r line; do
              SLUG=$(extract_slug "$line")
              TITLE=$(extract_title "$line")
              echo "- [${TITLE}](${BASE_URL}/blog/${SLUG})"
            done)
          else
            REMOVED_LIST="无删除博客"
          fi

          MESSAGE=$(cat <<EOF
          {
            "msgtype": "markdown",
            "markdown": {
              "content": "**📢 博客变更通知**\n> 仓库: [${{ github.repository }}](${{ github.server_url }}/${{ github.repository }})\n> 分支: \`${{ github.ref_name }}\`\n> 提交信息: ${{ github.event.head_commit.message }}\n> 执行者: ${{ github.actor }}\n\n**新增博客文章**:\n${ADDED_LIST}\n\n**更新博客文章**:\n${UPDATED_LIST}"
            }
          }
          EOF
          )

          curl -X POST -H "Content-Type: application/json" -d "$MESSAGE" $WECHAT_WEBHOOK
```

## 封装 Action 便于复用

既然有了这样一个过程，为什么不开放出来给更多人一起分享呢？了解到 GitHub Marketplace 是可以发布 Action 的。遂进行了一番研究。

想要封装 Action 需要使用 JavaScript，而上面我都是用 Shell 脚本写的，所以还需要转换一番。

一个 Action 项目的典型结构如下：

```bash
xxx-action/
├── action.yml       # GitHub Action 的核心描述文件
├── package.json     # 包依赖声明文件
├── src/             # 源代码目录
│   └── index.js     # 插件的主要逻辑
├── dist/            # 编译后的代码（自动生成）
├── .github/         # 可选，包含发布或文档相关文件
└── README.md        # 插件的说明文档
```

Action 的代码和上面的 Shell 其实逻辑是一样的，只是改用 JS 来实现，所以没啥太多好说的。

如果你希望在创建 Release 的时候自动发布 Action，可以添加如下的 workflows:

```yml
name: Release Action to Marketplace

on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Install dependencies
        run: |
          npm install
          npm run build

      - name: Create release artifacts
        run: |
          mkdir -p release
          cp -R dist action.yml README.md release/

      - name: Upload release artifacts
        uses: actions/upload-artifact@v3
        with:
          name: xxx-action
          path: release
```

如果是本地打包，则可以使用如下命令：

```bash
npm install
npm run build
```

build 对应的命令是：

```json
"scripts": {
    "build": "ncc build src/index.js -o dist"
}
```

在发布插件前，应准备好标题、描述、图标、图标颜色等物料信息，以及 README 文件。  
在提交代码到 Github 后，Github 检测到这是一个 Action，会在 Release 时主动询问你要不要发到 GitHub Marketplace 的。